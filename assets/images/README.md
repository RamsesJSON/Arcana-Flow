# Image Presets Folder

Place your preset images here. The filenames should match those defined in `config.js`.

## Expected Files:
- `img1.jpg` through `img16.jpg`

## Recommended Size:
- **Width:** 300-600px
- **Height:** 200-400px
- **Format:** PNG, JPG, or WebP

## Adding New Presets:
1. Add your image file to this folder
2. Open `config.js`
3. Add an entry to `IMAGE_PRESETS`:
   ```javascript
   { name: "My Image", file: "assets/images/my-image.png", category: "custom" }
   ```

## Built-in Presets
The app includes built-in SVG presets that always work, even without files:
- Void (Built-in)
- Energy (Built-in)
- Spirit (Built-in)
