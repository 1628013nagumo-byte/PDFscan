export type ElementKind = 'text' | 'image' | 'rect' | 'ellipse' | 'line' | 'checkbox'

export type FontFamilyId = 'mplus1p' | 'zenmarugothic'

export interface ElementBase {
  id: string
  kind: ElementKind
  /** top-left origin, y-down, units = PDF points (1/72 inch), relative to the (unrotated) page */
  x: number
  y: number
  width: number
  height: number
}

export interface TextElement extends ElementBase {
  kind: 'text'
  text: string
  fontSize: number
  color: string
  opacity: number
  bold: boolean
  underline: boolean
  fontFamily: FontFamilyId
  align: 'left' | 'center' | 'right'
}

export interface ImageElement extends ElementBase {
  kind: 'image'
  dataUrl: string
  bytes: ArrayBuffer
  mime: 'image/png' | 'image/jpeg'
}

export interface ShapeElement extends ElementBase {
  kind: 'rect' | 'ellipse' | 'line'
  fillColor: string
  fillOpacity: number
  hasFill: boolean
  strokeColor: string
  strokeOpacity: number
  strokeWidth: number
  hasStroke: boolean
  text: string
  textColor: string
  fontSize: number
}

export interface CheckboxElement extends ElementBase {
  kind: 'checkbox'
  checked: boolean
  color: string
  strokeWidth: number
}

export type PageElement = TextElement | ImageElement | ShapeElement | CheckboxElement

/** A loosely-typed patch that may carry fields from any concrete element kind. */
export type PageElementPatch = Partial<TextElement> &
  Partial<ImageElement> &
  Partial<ShapeElement> &
  Partial<CheckboxElement>

export interface SourceDoc {
  id: string
  name: string
  bytes: ArrayBuffer
}

export interface PageItem {
  id: string
  sourceDocId: string
  sourcePageIndex: number
  /** unrotated raw mediabox size (PDF points), i.e. the page as pdf-lib sees it */
  rawWidth: number
  rawHeight: number
  /** inherent /Rotate of the source page (0/90/180/270) */
  sourceRotate: number
  /** additional rotation the user applied in this app (0/90/180/270) */
  rotate: number
  elements: PageElement[]
}
