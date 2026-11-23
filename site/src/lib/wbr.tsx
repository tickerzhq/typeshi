import { Fragment } from "react";

/**
 * An identifier that may break after its underscores: golden_parachute wraps as golden_ / parachute
 * when it doesn't fit, not at whatever letter the edge falls on. <wbr> adds no characters, so a
 * copy or a screen reader gets the name as it is.
 */
export function wbr(name: string) {
  const parts = name.split("_");
  return parts.map((part, i) => (
    <Fragment key={i}>
      {part}
      {i < parts.length - 1 && (
        <>
          _<wbr />
        </>
      )}
    </Fragment>
  ));
}
