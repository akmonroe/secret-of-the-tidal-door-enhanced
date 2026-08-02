# Graphics Bible — Switch Diorama Look

## Camera
- Perspective, FOV **42°**
- Pitch ~**58°** from horizontal (high angle, readable mazes)
- Distance from player ~**18** units
- Soft follow lag (lerp ~0.08–0.12 per frame at 60fps)
- Never free-orbit in gameplay

## Scale
| Thing | Size (units) |
|-------|----------------|
| Player height | 1.0 |
| Grid cell | 2.0 |
| Wall height | 1.2–1.8 |
| House | ~6 wide × 5 deep × 4 tall |

## Materials
- Prefer **MeshToonMaterial** or **MeshLambertMaterial** + hemisphere light
- Strong biome palettes, low texture detail (toy / diorama)
- Water: transparent blue, slight opacity, slow UV or vertex bob later

## Shadows
- Desktop: soft directional shadow map (512–1024)
- Mobile / low: **blob shadow** disc under actors only

## Characters
- Head slightly large (chibi-lite, not full chibi)
- Boy: short hair, teal shirt, blue shorts
- Girl: longer hair/braid, coral dress
- Scuba: tank + mask + darker suit

## Performance
- `pixelRatio = min(devicePixelRatio, 2)`
- Merge static maze walls
- Instance repeated props when count > 20
