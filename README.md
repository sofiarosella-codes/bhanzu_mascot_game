# Debug Zippy

A small maths game for kids, styled with the Bhanzu brand guidelines and UI style sheet.

Zippy the tiger is stuck in the code. The child solves a sum, turns the answer into a letter (A = 1 ... Z = 26), and the letter flies into the secret word while Zippy rises a little more from the bottom of the frame. After the fifth clue Zippy wakes up, celebrates, and says thank you for finding it and playing.

It is plain HTML, CSS and JavaScript. There is no build step and nothing to install.

## Run it locally

Open `index.html` in a browser, or run a tiny server:

```
npx serve .
```

## Put it on GitHub and Vercel

1. Create a new repository on GitHub and upload everything in this folder, including the `assets` folder.
2. In Vercel, choose **Add New > Project** and import the repository.
3. Leave the framework as **Other**, leave the build command and output directory empty, and click **Deploy**.

Every push to GitHub redeploys automatically.

## Change the game

Everything you are likely to edit is in `config.js`:

- `rounds`: the sums, their answers (1 to 26) and a hint shown after two wrong tries. The letters of the answers, in order, spell the secret word. The defaults spell ZIPPY (26, 9, 16, 16, 25).
- `mascotName` and `messages`: the name and everything Zippy says.
- `poses`: the seven tiger expressions (calm, happy, sad, cry, shocked, party, cheer).

### Sharper tiger artwork

The tiger frames were cut from a small screenshot (about 70px each) and enlarged, so they look slightly soft on big or high-density screens. To upgrade them, export the same seven poses from Figma as 2x or 3x PNGs with a transparent background and overwrite the files in `assets/tiger/` using the same names. Nothing else needs to change.

## What is in the folder

- `index.html`, `style.css`, `game.js`, `config.js`: the game
- `assets/tiger/`: the seven tiger poses
- `assets/brand/`: the Bhanzu logo, the pictorial mark and the favicon, taken from the brand guidelines
- `vercel.json`: security headers for Vercel

## Notes

- Fonts (Poppins and Roboto) load from Google Fonts, as in the brand guidelines.
- The thank-you line is also spoken aloud using the browser's text-to-speech, so the voice depends on the device. The speaker button turns all sound off.
- On touch screens the game shows an on-screen number pad instead of the phone keyboard.
- Animations are reduced automatically for people who have turned on "reduce motion".
