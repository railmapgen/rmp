# Line Style Guide: Creating a line style for Rail Map Painter

Rail Map Painter uses `react-i18n` to provide different languages. All translations are under `src/i18n/translations`. To add or change translation, the only thing you need to do is to change these files.

Example:

Suppose you have a key named `panel.details.station.myStation.displayName` and you want to add or update its translation, you need to find the value in the JSON files.

```json
{
    "panel": {
        "details": {
            "station": {
                "myStation": {
                    "displayName": "Replace your translation here."
                }
            }
        }
    }
}
```
