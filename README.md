# JS13K BATTLEGROUNDS

<img src="/screenshot.gif?raw=true">

Small PUBG clone using WebGL, WebAudio, and Google Closure.

Entry for the [js13kGames Competition](http://js13kgames.com/).

Based on the [js13kserver](https://github.com/js13kGames/js13kserver) starter project.

## Install

Clone and install with npm:

    git clone git@github.com:codyebberson/js13k-battlegrounds.git
    cd js13k-battlegrounds
    npm install

## Running

Run the server locally with the following command:

    npm start

Open server at [http://localhost:3000](http://localhost:3000)

## Building

First clone and install the sister project, [js13k-battlegrounds-out](https://github.com/codyebberson/js13k-battlegrounds-out).  The two projects ("js13k-battlegrounds" and "js13k-battlegrounds-out") must be sibling directories.

    git clone git@github.com:codyebberson/js13k-battlegrounds-out.git
    cd js13k-battlegrounds-out
    npm install

With that in place, you can now navigate to the "public" directory and build:

    cd ../js13k-battlegrounds/public
    ./build.sh

The build script does the following:
1) Uses Google Closure to create shared.js, client.js, and server.js
2) Copies the minified output to the "out" project
3) Creates a new public.zip file
4) Reports size statistics

## Postmortem

### Choosing the project

The category of "offline" reminded me of the desolate post-apocolyptic world of PUBG (or perhaps I was just playing too much PUBG around that time).  The idea of a battle royale game in 13kb sounded like a fun challenge.  At minimum, I wanted to see how far I could take a proof-of-concept.

### Server basics

I started with the [js13kserver](https://github.com/js13kGames/js13kserver) boilerplate project.  That project is turn-based game, so the first task was to convert to real-time.  Simple structs for "GameEntity" and "ServerGameState" originated here, and continued to the final project.  There are a million tricks you can use in multiplayer games (sending deltas, predictive movements, compression, etc).  I started with the most simple implementation of "send the full game state every round trip", which worked well enough, and also continued to the final project.

### 3D basics

Next, I integrated one of Mozilla's [WebGL tutorials](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Using_textures_in_WebGL).  Instead of 2D boxes running around on a flat canvas, the game now had 3D cubes floating around.

I followed [Brandon Jones' WebGL advice](https://blog.tojicode.com/2010/08/rendering-quake-3-maps-with-webgl-tech.html): offload as much work to the GPU as possible.  For each frame, there are exactly two calls to `gl.drawElements()`, one for static geometry (sky, ground, trees, rocks) and one for dynamic geometry (players, gunfire, blood, pickups).  There is no attempt at visibility or distance culling.  Everything is rendered every frame.  In addition to being fast, this is also simple and does not require much code.

One of the first size-related challenges was extracting a minimal version of [glMatrix](http://glmatrix.net/).  The Mozilla tutorials use glMatrix for matrix math, but the library is 27kb minified and zipped, which is obviously too heavy.  It turned out the demos really only required the vec3 and mat4 classes.  I grabbed the relevant files and included them directly.

At this point, I had a working proof of concept of WebSockets + WebGL.  The zipped, unminified JS code was around 8kb.  Good enough to move forward.

### Google Closure

Next, I wanted to introduce the Google Closure Compiler as early as possible.  I've used Closure before on the [Box DICOM Viewer](https://boxdicom.com), a medical image viewer, and [Taktyka](https://github.com/codyebberson/taktyka), another mini game competition entry.  Google Closure can produce amazing results, but has a steep learning curve.  In particular, it's important to get the basic file layout, data structures, and JSDoc annotations started early, because it's quite painful to add them later.

For a multiplayer game, minification is doubly complicated, because the same minification techniques must be shared across both the client and server.  For example, if your GameEntity class is minified to "A" on the client and "B" on the server, you're going to have a bad time.

Google Closure has a great feature called ["chunks"](https://stackoverflow.com/a/10401030/2051724).  These chunks represent a dependency graph of minimized output.  It ensures that functions and types in shared modules use the same names.

The build script is a simple bash file.  The last step of the build script builds the final .zip file with all published contents, and reports the file size.  This was extremely valuable because it enabled rapid testing of various techniques.  I would often come up with a clever abstraction, only to find that it actually made the result bigger.  Data doesn't lie, so I used the build script constantly to keep the file size tight.

### Images

All textures are squeezed into a single 128x128 texture file.  The output from Gimp is around 8kb.  [TinyPNG](https://tinypng.com/) compresses that same image to 1.1kb, which feels like magic.

The game entities are rendered in ["2.5D"](https://en.wikipedia.org/wiki/2.5D) similar to old games such as Wolfenstein 3D or the original Doom.  Player entities use ["billboarding"](https://en.wikipedia.org/wiki/2.5D#Billboarding) and are a single flat quad.  Trees and rocks are two perpendicular quads, which gives them a slightly more realistic look (they appear more stationary).

### Game features

After the basic setup and proof-of-concept, I moved onto the long slog of little feature development.

Game maps - The world is essentially a 20x20 2D tile map, where each tile is just grass.  The height of each corner of the map is precomputed using a simple procedural algorithm, which creates the "rolling hills" effect.  The RNG seed is shared by server to client, so they both use the same map.

Running - Running is also 2D-esque.  When the player runs, the X and Z coordinates are updated by run speed, and the Y (height) coordinate is simply a function of the height of the ground.  That means height/slope are not considered in run speed calculations, which means you run uphill/downhill very fast.

Shooting - Creating bullet entities on a straight trajectory was straightforward.  On the other hand, bullet collision detection is one of the most complicated parts of the code.  Rocks, trees, and players are modeled as simple spheres.  Each tick of the game, bullets are tested against the ground and those entities.  The bullet moves at high velocity, so you must be careful to figure out which collision happens first.

Blue Circle of Death - The iconic feature of battle royale games is the gradually shrinking circle that forces players into a smaller and smaller area.  The location of the circles is precomputed using the same RNG shared by client and server.  (Side note: that means the circle locations are all known on the client in advance, which could be displayed for cheating)  Both the server and the client test whether the player is outside of the circle -- the server for enforcing health damage, and the client for rendering a red damage overlay.  The circle itself is rendered as a translucent cylinder of 64 quads which roughly represent a circle.

Lobby - When the application first starts, the user is in the lobby.  The lobby is actually an instance of a "game" with the special ID of zero.  The client knows to render overlays differently for game ID=0, which creates the effect of the lobby.  All of the network communication is the same though.

Sound - The main sound effect in the game is gunfire.  The BBC has an [amazing article about gunfire algorithms](https://webaudio.prototyping.bbc.co.uk/gunfire/).  The algorithm includes adjustments for distance, which is one of the key features of the PUBG atmosphere.

Music - A year ago I researched lightweight JavaScript music for [Taktyka](https://github.com/codyebberson/taktyka), another size-constrained game competition.  That resulted in a convoluted process of converting MIDI files to a tight JavaScript representation and a tiny MIDI player (substantially smaller and less feature-rich than [TinyMusic](https://github.com/kevincennis/TinyMusic)).  I went as far as finding a [PUBG main menu cover](https://www.youtube.com/watch?v=BZtVJBgf7t8) that also provided a MIDI file.  [The result](https://cody.ebberson.com/2018/09/10/pubgmusic.html) only vaguely sounds like the original.  Alas, the whole exercise was moot, because it required about 4kb zipped, which exceeded the budget.  Instead I settled on a simple bass line + 3 chord loop.

### What went right

* The core prototype was done in the first week.  A key lesson from past competitions is to cut cut cut, keep scope about an order of magnitude smaller than you think.  Get a playable version working as quickly as possible.
* Simple WebGL is pretty powerful.  It was very nice to simply throw ~20k triangles at the GPU and not worry about the details.
* Google Closure continues to impress.  I'm a long time Closure fanboy, and this was yet another project that pleasantly surprised me.  The "chunk" feature was key to the client/server compilation and minification.

### What went wrong

* Building a multiplayer game for a small audience is tricky.  If there's nobody to play with, it's not very fun.
* Battle Royale games amplify the previous point.  If you do get 10 people to play at the same time, it's not fun to die in the first minute and wait for everyone else.
* Considering the previous points, I did not budget enough time or bytes for AI.  The simplistic AI originally existed only for dev testing.

### Conclusion

This was a fun project, and I look forward to doing js13k again next year.  I will definitely consider WebGL and Google Closure again.  I will probably avoid the "server" category though.