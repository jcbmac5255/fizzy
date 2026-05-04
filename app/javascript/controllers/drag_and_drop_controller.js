import { Controller } from "@hotwired/stimulus"
import { patch, post } from "@rails/request.js"
import { nextFrame } from "helpers/timing_helpers"

export default class extends Controller {
  static targets = [ "item", "container" ]
  static classes = [ "draggedItem", "hoverContainer" ]

  // Actions

  async dragStart(event) {
    event.dataTransfer.effectAllowed = "move"
    event.dataTransfer.dropEffect = "move"
    event.dataTransfer.setData("37ui/move", event.target)

    await nextFrame()
    this.dragItem = this.#itemContaining(event.target)
    this.sourceContainer = this.#containerContaining(this.dragItem)
    this.originalDraggedItemCssVariable = this.#containerCssVariableFor(this.sourceContainer)
    this.originalParent = this.dragItem.parentElement
    this.originalNextSibling = this.dragItem.nextElementSibling
    this.dragItem.classList.add(this.draggedItemClass)
  }

  dragOver(event) {
    event.preventDefault()
    if (!this.dragItem) { return }

    const container = this.#containerContaining(event.target)
    this.#clearContainerHoverClasses()

    if (!container) {
      this.#stopAutoScroll()
      return
    }

    if (container !== this.sourceContainer) {
      container.classList.add(this.hoverContainerClass)
      this.#applyContainerCssVariableToDraggedItem(container)
    } else {
      this.#restoreOriginalDraggedItemCssVariable()
      this.#reorderWithinSourceContainer(event, container)
    }

    this.#updateAutoScroll(event, container)
  }

  async drop(event) {
    const targetContainer = this.#containerContaining(event.target)

    if (!targetContainer) { return }

    if (targetContainer === this.sourceContainer) {
      this.wasDropped = true
      await this.#submitReorderRequest(this.dragItem, targetContainer)
      return
    }

    this.wasDropped = true
    this.#increaseCounter(targetContainer)
    this.#decreaseCounter(this.sourceContainer)

    const sourceContainer = this.sourceContainer
    this.#insertDraggedItem(targetContainer, this.dragItem)
    await this.#submitDropRequest(this.dragItem, targetContainer)
    this.#reloadSourceFrame(sourceContainer)
  }

  dragEnd() {
    this.dragItem.classList.remove(this.draggedItemClass)
    this.#clearContainerHoverClasses()
    this.#stopAutoScroll()

    if (!this.wasDropped) {
      this.#restoreOriginalDraggedItemCssVariable()
      this.#restoreOriginalDraggedItemPosition()
    }

    this.sourceContainer = null
    this.dragItem = null
    this.wasDropped = false
    this.originalDraggedItemCssVariable = null
    this.originalParent = null
    this.originalNextSibling = null
  }

  #itemContaining(element) {
    return this.itemTargets.find(item => item.contains(element) || item === element)
  }

  #containerContaining(element) {
    return this.containerTargets.find(container => container.contains(element) || container === element)
  }

  #clearContainerHoverClasses() {
    this.containerTargets.forEach(container => container.classList.remove(this.hoverContainerClass))
  }

  #applyContainerCssVariableToDraggedItem(container) {
    const cssVariable = this.#containerCssVariableFor(container)
    if (cssVariable) {
      this.dragItem.style.setProperty(cssVariable.name, cssVariable.value)
    }
  }

  #restoreOriginalDraggedItemCssVariable() {
    if (this.originalDraggedItemCssVariable) {
      const { name, value } = this.originalDraggedItemCssVariable
      this.dragItem.style.setProperty(name, value)
    }
  }

  #restoreOriginalDraggedItemPosition() {
    if (!this.originalParent || !this.dragItem) return
    if (this.dragItem.parentElement === this.originalParent && this.dragItem.nextElementSibling === this.originalNextSibling) return

    if (this.originalNextSibling && this.originalNextSibling.parentElement === this.originalParent) {
      this.originalParent.insertBefore(this.dragItem, this.originalNextSibling)
    } else {
      this.originalParent.appendChild(this.dragItem)
    }
  }

  #containerCssVariableFor(container) {
    const { dragAndDropCssVariableName, dragAndDropCssVariableValue } = container.dataset
    if (dragAndDropCssVariableName && dragAndDropCssVariableValue) {
      return { name: dragAndDropCssVariableName, value: dragAndDropCssVariableValue }
    }
    return null
  }

  #increaseCounter(container) {
    this.#modifyCounter(container, count => count + 1)
  }

  #decreaseCounter(container) {
    this.#modifyCounter(container, count => Math.max(0, count - 1))
  }

  #modifyCounter(container, fn) {
    const counterElement = container.querySelector("[data-drag-and-drop-counter]")
    if (counterElement) {
      const currentValue = counterElement.textContent.trim()

      if (!/^\d+$/.test(currentValue)) return

      counterElement.textContent = fn(parseInt(currentValue))
    }
  }

  #insertDraggedItem(container, item) {
    const itemContainer = container.querySelector("[data-drag-drop-item-container]")
    const topItems = itemContainer.querySelectorAll("[data-drag-and-drop-top]")
    const firstTopItem = topItems[0]
    const lastTopItem = topItems[topItems.length - 1]

    const isTopItem = item.hasAttribute("data-drag-and-drop-top")
    const referenceItem = isTopItem ? firstTopItem : lastTopItem

    if (referenceItem) {
      referenceItem[isTopItem ? "before" : "after"](item)
    } else {
      itemContainer.prepend(item)
    }
  }

  async #submitDropRequest(item, container) {
    const body = new FormData()
    const id = item.dataset.id
    const url = container.dataset.dragAndDropUrl.replaceAll("__id__", id)

    return post(url, { body, headers: { Accept: "text/vnd.turbo-stream.html" } })
  }

  #updateAutoScroll(event, container) {
    const itemContainer = container.querySelector("[data-drag-drop-item-container]")
    if (!itemContainer || itemContainer.scrollHeight <= itemContainer.clientHeight) {
      this.#stopAutoScroll()
      return
    }

    const edgeSize = 60
    const maxSpeed = 14
    const rect = itemContainer.getBoundingClientRect()
    const distFromTop = event.clientY - rect.top
    const distFromBottom = rect.bottom - event.clientY

    let speed = 0
    if (distFromTop >= 0 && distFromTop < edgeSize) {
      speed = -Math.ceil(((edgeSize - distFromTop) / edgeSize) * maxSpeed)
    } else if (distFromBottom >= 0 && distFromBottom < edgeSize) {
      speed = Math.ceil(((edgeSize - distFromBottom) / edgeSize) * maxSpeed)
    }

    if (speed === 0) {
      this.#stopAutoScroll()
    } else {
      this.#startAutoScroll(itemContainer, speed)
    }
  }

  #startAutoScroll(target, speed) {
    this.autoScrollTarget = target
    this.autoScrollSpeed = speed
    if (this.autoScrollFrame) return

    const tick = () => {
      if (!this.autoScrollTarget || !this.dragItem) {
        this.autoScrollFrame = null
        return
      }
      this.autoScrollTarget.scrollTop += this.autoScrollSpeed
      this.autoScrollFrame = requestAnimationFrame(tick)
    }
    this.autoScrollFrame = requestAnimationFrame(tick)
  }

  #stopAutoScroll() {
    if (this.autoScrollFrame) {
      cancelAnimationFrame(this.autoScrollFrame)
      this.autoScrollFrame = null
    }
    this.autoScrollTarget = null
    this.autoScrollSpeed = 0
  }

  #reorderWithinSourceContainer(event, container) {
    const overItem = this.#itemContaining(event.target)
    if (!overItem || overItem === this.dragItem) return
    if (this.#containerContaining(overItem) !== container) return

    const { top, height } = overItem.getBoundingClientRect()
    const insertBefore = event.clientY < top + height / 2

    if (insertBefore && overItem.previousElementSibling !== this.dragItem) {
      overItem.before(this.dragItem)
    } else if (!insertBefore && overItem.nextElementSibling !== this.dragItem) {
      overItem.after(this.dragItem)
    }
  }

  async #submitReorderRequest(item, container) {
    const reorderUrlTemplate = container.dataset.dragAndDropReorderUrl
    if (!reorderUrlTemplate) return

    const itemsInContainer = this.itemTargets.filter(target => this.#containerContaining(target) === container)
    const position = itemsInContainer.indexOf(item) + 1
    if (position < 1) return

    const id = item.dataset.id
    const url = reorderUrlTemplate.replaceAll("__id__", id)

    return patch(url, { body: { position }, responseKind: "turbo-stream" })
  }

  #reloadSourceFrame(sourceContainer) {
    const frame = sourceContainer.querySelector("[data-drag-and-drop-refresh]")
    if (frame) frame.reload()
  }
}
