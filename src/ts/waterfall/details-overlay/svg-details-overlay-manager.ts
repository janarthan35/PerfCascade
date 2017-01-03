import {OpenOverlay, OverlayChangeEvent} from "../../typing/open-overlay";
import {WaterfallEntry} from "../../typing/waterfall";
import * as overlayChangesPubSub from "./overlay-changes-pub-sub";
import {createRowInfoOverlay} from "./svg-details-overlay";

/** Collection of currely open overlays */
let openOverlays: OpenOverlay[] = [];

/** all open overlays height combined */
export function getCombinedOverlayHeight() {
  return openOverlays.reduce((pre, curr) => pre + curr.height, 0);
}

/** y offset to it's default y position */
export function getOverlayOffset(rowIndex: number): number {
  return openOverlays.reduce((col, overlay) => {
    if (overlay.index < rowIndex) {
      return col + overlay.height;
    }
    return col;
  }, 0);
}

/**
 * closes on overlay - rerenders others internally
 */
export function closeOverlay(index: number, overlayHolder: SVGGElement,
                             accordionHeight: number, barEls: SVGGElement[]) {

  openOverlays.splice(openOverlays.reduce((prev: number, curr, i) => {
    return (curr.index === index) ? i : prev;
  }, -1), 1);

  renderOverlays(accordionHeight, overlayHolder);
  overlayChangesPubSub.publishToOverlayChanges({
    "type" : overlayChangesPubSub.eventTypes.CLOSE,
    "openOverlays": openOverlays,
    "combinedOverlayHeight": getCombinedOverlayHeight()
  } as OverlayChangeEvent);
  realignBars(barEls);
}

/**
 * Opens an overlay - rerenders others internaly
 */
export function openOverlay(index: number, y: number, accordionHeight: number, block: WaterfallEntry,
                            overlayHolder: SVGGElement, barEls: SVGGElement[]) {

  if (openOverlays.filter((o) => o.index === index).length > 0) {
    return;
  }

  openOverlays.push({
    "index": index,
    "defaultY": y,
    "block": block,
    "onClose": () => {
      this.closeOverlay(index, overlayHolder, accordionHeight, barEls);
    }
  });

  renderOverlays(accordionHeight, overlayHolder);
  overlayChangesPubSub.publishToOverlayChanges({
    "type" : overlayChangesPubSub.eventTypes.OPEN,
    "openOverlays": openOverlays,
    "combinedOverlayHeight": getCombinedOverlayHeight()
  } as OverlayChangeEvent);
  realignBars(barEls);
}

/**
 * sets the offset for request-bars
 * @param  {SVGGElement[]} barEls
 */
function realignBars(barEls: SVGGElement[]) {
  barEls.forEach((bar, j) => {
    let offset = getOverlayOffset(j);
    bar.style.transform = `translate(0, ${offset}px)`;
  });
}

 /**
  * removes all overlays and renders them again
  *
  * @summary this is to re-set the "y" position since there is a bug in chrome with
  * tranform of an SVG and positioning/scoll of a foreignObjects
  * @param  {number} accordionHeight
  * @param  {SVGGElement} overlayHolder
  */
function renderOverlays(accordionHeight: number, overlayHolder: SVGGElement) {
  while (overlayHolder.firstChild ) {
    overlayHolder.removeChild(overlayHolder.firstChild);
  }

  let currY = 0;
  openOverlays
    .sort((a, b) => a.index > b.index ? 1 : -1)
    .forEach((overlay) => {
      let y = overlay.defaultY + currY;
      let infoOverlay = createRowInfoOverlay(overlay.index, y, accordionHeight,
        overlay.block, overlay.onClose);
      // if overlay has a preview image show it
      let previewImg = infoOverlay.querySelector("img.preview") as HTMLImageElement;
      if (previewImg && !previewImg.src) {
        previewImg.setAttribute("src", previewImg.attributes.getNamedItem("data-src").value);
      }
      overlayHolder.appendChild(infoOverlay);

      let currHeight = infoOverlay.getBoundingClientRect().height;
      currY += currHeight;
      overlay.actualY = y;
      overlay.height = currHeight;
      return overlay;
    });
}
