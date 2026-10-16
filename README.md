# Debug the Mascot

A small maths game for kids. The mascot is hidden behind a cloud of bugs. The child solves a sum, turns the answer into a letter (A = 1 ... Z = 26), squashes a bug, and a piece of the mascot appears along with one letter of the secret word. After the last sum the mascot comes to life, says thank you, and celebrates.

It is plain HTML, CSS and JavaScript. There is no build step and nothing to install.

## Run it locally

Open `index.html` in a browser, or run a tiny server:

```
npx serve .
```

## Put it on GitHub and Vercel

1. Create a new repository on GitHub and upload everything in this folder (drag and drop works in the web UI).
2. In Vercel, choose **Add New > Project** and import the repository.
3. Leave the framework as **Other**, leave the build command and output directory empty, and click **Deploy**.

Vercel gives you a link you can share straight away. Every push to GitHub redeploys automatically.

## Change the game

Everything you are likely to edit is in `config.js`:

- `rounds`: the sums, their answers (1 to 26) and a hint shown after two wrong tries.
- The letters of the answers, in order, spell the secret word. The default sums spell ZIPPY (26, 9, 16, 16, 25).
- `mascotName` and `messages`: the name and what the mascot says.
- `mascotImage`: set it to a PNG or SVG in this folder (for example `"zippy.png"`) to use your own mascot. It starts blurred and grey, and sharpens and gains colour with each sum solved.

## Notes

- The built-in mascot is a simple original character, and the bugs are emoji.
- The thank-you line is spoken aloud using the browser's text-to-speech. Voice quality depends on the device. The speaker button in the corner turns all sound off.
- Animations are reduced automatically for people who have turned on "reduce motion".
