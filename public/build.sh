#!/bin/bash

java -jar ../tools/closure-compiler-v20180805.jar \
    --language_in ECMASCRIPT6_TYPED \
    --language_out ECMASCRIPT_2015 \
    --compilation_level ADVANCED_OPTIMIZATIONS \
    --strict_mode_input \
    --dependency_mode LOOSE \
    --warning_level VERBOSE \
    --summary_detail_level=3 \
    --externs externs.js \
    --js shared.js \
    --chunk shared:1 \
    --js vec3.js \
    --js mat4.js \
    --js bufferset.js \
    --js keys.js \
    --js webglutils.js \
    --js audio.js \
    --js minimap.js \
    --js hud.js \
    --js network.js \
    --js client.js \
    --js engine.js \
    --chunk client:11:shared \
    --js server.js \
    --chunk server:1:shared \
    --chunk_output_path_prefix "out-"

# Copy compiler output to the output project
mv out-shared.js ../../js13k-battlegrounds-out/public/shared.js
mv out-client.js ../../js13k-battlegrounds-out/public/client.js
mv out-server.js ../../js13k-battlegrounds-out/public/server.js
cp textures.png ../../js13k-battlegrounds-out/public/textures.png

# Create a zip file
rm -f public.zip
7z a -mx9 -tzip public.zip ../../js13k-battlegrounds-out/public/*

# Report the remaining bytes
echo "$((13312 - $(wc -c < public.zip))) bytes remaining"
