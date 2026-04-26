# india-courts.json

Place the eCourts state → district → court complex JSON here.

The file should be a JSON array matching the structure:

```json
[
  {
    "state": "Andaman and Nicobar",
    "stateValue": "28",
    "districts": [
      {
        "district": "Port Blair",
        "districtValue": "1",
        "courtComplexes": [
          {
            "value": "1280004@2,3,4,5@N",
            "text": "PORT BLAIR COURT COMPLEX"
          }
        ]
      }
    ]
  }
]
```

Source: eCourts portal cascade API (district.ecourts.gov.in)
