import { Controller } from "@hotwired/stimulus"

const HEX_PATTERN = /^#[0-9a-f]{6}$/i

export default class extends Controller {
  static targets = [ "picker", "text" ]

  pickerChanged() {
    this.textTarget.value = this.pickerTarget.value
  }

  textChanged() {
    const value = this.textTarget.value.trim()
    const normalized = value.startsWith("#") ? value : `#${value}`
    if (HEX_PATTERN.test(normalized)) {
      this.pickerTarget.value = normalized
    }
  }
}
