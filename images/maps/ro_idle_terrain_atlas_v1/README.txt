RO Idle Terrain Atlas v1 - usage notes
======================================

Source atlas: 1536x1024 px
Layout: 4 columns x 4 rows; each crop is approximately 384x256 px.

Important:
- These 16 files are working crops from a generated concept atlas.
- They are NOT guaranteed seamless textures.
- Do not yet use them as endlessly repeating scrolling backgrounds without checking edges.
- For production, clean the cell edges, remove unwanted boundary artifacts, then create/test seamless edges.
- Fixed props (houses, boats, trees, statues) should be separate transparent assets, not baked into the ground.

Suggested mapping:
01-01 town stone plaza: Prontera-like neutral stone plaza
01-02 warm cobble: warm-toned town streets
01-03 grass: generic field
01-04 sandy grass: dry field
02-01 desert sand: Morroc-like desert base
02-02 snow ice: snow fields / ice areas
02-03 purple stone: Comodo-like purple town palette
02-04 rocky field: rocky fields / mine outskirts
03-01 forest grass: forest floor
03-02 beach shore: beach / island maps
03-03 dry yellow field: arid grassland
03-04 volcanic ground: volcano maps
04-01 pale stone: clean town paving
04-02 flower meadow: flowered field
04-03 ashen rock: grave / dark dungeon areas
04-04 mossy stone: old ruins / temple areas
