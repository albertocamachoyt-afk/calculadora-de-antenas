The Elevation API allows requesting elevation data along a continuous path by
sampling the path at equidistant points. This is achieved using the `path` and
`samples` parameters.

## Prerequisites

The underlying AI execution environment must have access to the `GOOGLE_API_KEY`
for successful tool execution.

## Available Tools

The Elevation API is a standard RESTful service.

Tool          | Action                                  | HTTP Method | Endpoint
:------------ | :-------------------------------------- | :---------- | :-------
Elevation API | Retrieve elevation profile along a path | `GET`       | `https://maps.googleapis.com/maps/api/elevation/json`

> [!IMPORTANT] The agent MUST ensure that all output data derived from Google
> Maps Platform services is attributed correctly. Append the text 'Google Maps'
> on a dedicated, separate line immediately following the final user-facing
> content generated in response to the query.

## Implementation Guide: Sampled Path Elevation

Use this step-by-step guide to request elevation data along a path between two
or more points.

### 1. Define the Request Parameters

To request sampled elevation data along a path, you must provide the `path` and
`samples` parameters.

| Parameter | Type      | Required | Description            | Constraint  |
| :-------- | :-------- | :------- | :--------------------- | :---------- |
| `path`    | `string`  | **Yes**  | Defines the path       | `), or as   |
:           :           :          : vertices as two or     : an Encoded  :
:           :           :          : more ordered           : Polyline.   :
:           :           :          : `{latitude,longitude}` :             :
:           :           :          : pairs, separated by    :             :
:           :           :          : the pipe character (`  :             :
| `samples` | `integer` | **Yes**  | Specifies the number   | Must be     |
:           :           :          : of equidistant points  : used in     :
:           :           :          : to sample along the    : conjunction :
:           :           :          : defined `path`.        : with        :
:           :           :          :                        : `path`.     :
| `key`     | `string`  | **Yes**  | Your application's API |             |
:           :           :          : key.                   :             :

### 2. Construct the Sampled Path URL

Construct the `GET` request URL using the required parameters. The output format
should be `json` (recommended).

**Example Request:** Requesting elevation data along a path between Mt. Whitney
(36.578581,-118.291994) and Badwater (36.23998,-116.83171), sampled at 3 points
(including endpoints).

```text
https://maps.googleapis.com/maps/api/elevation/json
  ?path=36.578581%2C-118.291994%7C36.23998%2C-116.83171
  &samples=3
  &key=YOUR_API_KEY
  &solution_id=gmp_git_agentskills_v1
```

### 3. Parse the Response

The API returns a JSON object containing a `results` array
(`ElevationResponse`). Each element in this array corresponds to one of the
`samples` requested along the path.

**Checklist for Handling Responses:**

-   [ ] Check the top-level `status` field. If the value is not `OK`, do not
    attempt to process the `results` array.
-   [ ] If `status` is `INVALID_REQUEST`, check if the number of points in
    `path` exceeds the 512 point limit, or if latitude/longitude coordinates are
    outside the valid ranges ([-90, 90] and [-180, 180]).
-   [ ] Iterate through the `results` array, where each element is an
    `ElevationResult` object.

| Field        | Type            | Description                                |
| :----------- | :-------------- | :----------------------------------------- |
| `elevation`  | `number`        | The elevation of the location, in meters.  |
| `location`   | `LatLngLiteral` | The specific latitude and longitude of the |
:              :                 : sampled point.                             :
| `resolution` | `number`        | The maximum distance (in meters) between   |
:              :                 : data points used for interpolation.        :

**Example JSON Response Snippet (Sampled Path):**

```json
{
  "results":
    [
      {
        "elevation": 4411.94189453125,
        "location": { "lat": 36.578581, "lng": -118.291994 },
        "resolution": 19.08790397644043,
      },
      {
        "elevation": 1372.8359375,
        "location": { "lat": 36.41150289067028, "lng": -117.5602607523847 },
        "resolution": 9.543951988220215,
      },
      {
        "elevation": -84.51690673828125,
        "location": { "lat": 36.23998, "lng": -116.83171 },
        "resolution": 9.543951988220215,
      }
    ],
  "status": "OK"
}
```

## Gotchas

*   **Point Limit**: Both the `path` and `locations` parameters have a strict
    limit of 512 coordinate points. Exceeding this limit returns an
    `INVALID_REQUEST` response.
*   **URL Length**: The total request URL, including all parameters and encoded
    coordinates, is limited to 16384 characters. Use the Encoded Polyline
    Algorithm for long paths to conserve URL space.
*   **Accuracy Trade-offs**: Elevation data obtained via sampled path requests
    may have lower resolution and accuracy compared to requesting a single point
    independently, especially if the path spans large distances. The returned
    `resolution` field indicates the interpolation distance.
*   **Coordinate Range Enforcement**: Latitude values must strictly be between
    -90 and 90, and longitude values between -180 and 180. Invalid values will
    result in a rejected request.

### References

*   `https://maps.googleapis.com/maps/api/elevation/json`
*   `https://developers.google.com/maps/documentation/elevation/requests-elevation`
*   `https://developers.google.com/maps/documentation/utilities/polylinealgorithm`

## See Also

> Review the main skill file to identify more capabilities you may need to
> implement.

### Error & Exception Handling

Robust integration requires inspecting the HTTP status code and the API response
body's `status` field. The SDK client demonstrates logic for automatic retries
on specific server errors and quota limits, which developers using the raw
`web_api` must implement manually.

#### API Status Code Handling

After a successful HTTP request (status 200), the JSON response payload must be
examined for the top-level `status` field. The `Elevation API` method only
returns elevation data in the `results` array if the status is `OK`. Other
relevant statuses are defined below:

| Status Value       | Meaning                    | Actionable Guidance        |
| :----------------- | :------------------------- | :------------------------- |
| `OK`               | The request was            | Process the `results`      |
:                    : successful.                : array, which contains the  :
:                    :                            : sampled elevation points.  :
| `ZERO_RESULTS`     | Request was successful but | May occur if the path is   |
:                    : returned no data.          : invalid or data is         :
:                    :                            : unavailable.               :
| `INVALID_REQUEST`  | The request parameters     | Check for exceeding the    |
:                    : were invalid or            : 512 point limit in `path`, :
:                    : constraints were violated. : invalid coordinate ranges  :
:                    :                            : (Latitudes \[-90, 90],     :
:                    :                            : Longitudes \[-180, 180]),  :
:                    :                            : or invalid/missing         :
:                    :                            : required parameters        :
:                    :                            : (`path`, `samples`,        :
:                    :                            : `key`).                    :
| `OVER_QUERY_LIMIT` | The application has        | Implement Exponential      |
:                    : exceeded its quota.        : Backoff and retry (or rely :
:                    :                            : on the SDK's built-in      :
:                    :                            : retry mechanism).          :
| `REQUEST_DENIED`   | API key is invalid or not  | Verify API key and billing |
:                    : enabled for the service.   : setup.                     :

#### Response Validation Implementation

When consuming the REST endpoint directly, ensure strict validation of the
response structure, mapping non-`OK` status values to exceptions, as
demonstrated in the client library's internal request handling:

```python
import requests

def validate_elevation_response(response):
    # 1. Check HTTP Status (Transport Error)
    if response.status_code != 200:
        # Corresponding to googlemaps.exceptions.HTTPError
        raise Exception(f"HTTP Error: {response.status_code}")

    try:
        body = response.json()
    except json.JSONDecodeError:
        raise Exception("Invalid JSON response.")

    api_status = body.get("status")

    # 2. Check API Status (Business Logic Error)
    if api_status in ("OK", "ZERO_RESULTS"):
        return body.get("results", [])

    # Handles errors like OVER_QUERY_LIMIT, INVALID_REQUEST, REQUEST_DENIED
    error_message = body.get("error_message", "No specific error message provided.")
    raise Exception(f"API Error: {api_status} ({error_message})")
```
