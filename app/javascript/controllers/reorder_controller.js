import { Controller } from "@hotwired/stimulus"
import { patch } from "@rails/request.js"

const DRAGGING_CLASS = "reorder__dragging"

export default class extends Controller {
  static targets = [ "item" ]
  static values = { url: String }

  dragStart(event) {
    const item = this.#itemFrom(event.target)
    if (!item) return

    this.dragItem = item
    event.dataTransfer.effectAllowed = "move"
    event.dataTransfer.setData("text/plain", item.dataset.reorderId || "")
    requestAnimationFrame(() => item.classList.add(DRAGGING_CLASS))
  }

  dragOver(event) {
    if (!this.dragItem) return

    event.preventDefault()
    event.dataTransfer.dropEffect = "move"

    const overItem = this.#itemFrom(event.target)
    if (!overItem || overItem === this.dragItem) return

    const { top, height } = overItem.getBoundingClientRect()
    const insertBefore = event.clientY < top + height / 2

    if (insertBefore && overItem.previousElementSibling !== this.dragItem) {
      overItem.before(this.dragItem)
    } else if (!insertBefore && overItem.nextElementSibling !== this.dragItem) {
      overItem.after(this.dragItem)
    }
  }

  drop(event) {
    if (!this.dragItem) return

    event.preventDefault()

    const position = this.itemTargets.indexOf(this.dragItem) + 1
    const id = this.dragItem.dataset.reorderId
    if (!id || position < 1) return

    const url = this.urlValue.replace("__id__", id)
    patch(url, { body: { position }, responseKind: "turbo-stream" })
  }

  dragEnd() {
    if (this.dragItem) {
      this.dragItem.classList.remove(DRAGGING_CLASS)
      this.dragItem = null
    }
  }

  #itemFrom(element) {
    return this.itemTargets.find(item => item === element || item.contains(element))
  }
}
