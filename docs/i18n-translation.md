# Translation Guide: How to Create or Update the translation

Rail Map Painter uses `react-i18n` to provide different languages. All translations are under `src/i18n/translations`. To add or change translation, the only thing you need to do is to change these files.

Example:

Suppose you have a key named `panel.details.stations.myStation.displayName` and you want to add or update its translation, you need to find the value in the JSON files for every language.

```json
{
    "panel": {
        "details": {
            "stations": {
                "myStation": {
                    "displayName": "Replace your translation here."
                }
            }
        }
    }
}
```
