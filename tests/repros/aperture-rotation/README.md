# Gerber aperture rotation changes short-check results

Run `bun test tests/repros/aperture-rotation`.

![PCB and Gerber comparison](__snapshots__/aperture-rotation-comparison.snap.png)

Both columns render the same Circuit JSON through the production checker. The
left uses PCB geometry; the right exports Gerber and rasterizes it. A pink ring
marks a detected contact between electrically independent copper objects.

The pad is 2.2 × 0.24 mm, with 0.06 mm corner radius and 45° counterclockwise
rotation. The via has 0.30 mm outer diameter and a 0.15 mm hole.

| Case       | Via center (mm) | Correct result | Current Gerber result |
| ---------- | --------------- | -------------- | --------------------- |
| A: contact | (0.65, 0.65)    | 1 short        | 0, a missed short     |
| B: clear   | (0.85, 0)       | 0 shorts       | 1, a false positive   |

Case A lies along the pad's diagonal centerline. Case B is about 0.60 mm
from that centerline, exceeding the pad half-width plus via radius (0.27 mm).
The separation is deliberately much larger than a bitmap pixel.

The exported Gerber contains `%LR45*%`, but `gerber-parser` (used by
`gerber-to-svg` 4.2.8) ignores that command. The horizontal pad in the right
column is the copper actually used for detection. The checker does not create
a physical short: it evaluates the wrong shape.

The two `test.failing` cases execute assertions for the intended results. The
snapshot test records the current output without asserting incorrect short
counts as desired behavior. A fix should remove `.failing`, update the snapshot,
and render the unmodified Gerber correctly. No production code changes here.

This isolates the rotated-pad failure discussed in check-shorts #71 and #73;
it is not a reproduction of every short reported on the original user's board.
