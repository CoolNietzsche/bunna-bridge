# Beersheba Platform EUDR Compliance Engine

This document details the European Union Deforestation Regulation (EUDR) compliance engine integrated into the Beersheba platform. It outlines the seven-gate validation process, the underlying business logic, and the technical implementation that ensures all coffee exported through the platform meets EUDR requirements.

## 1. Overview of EUDR Compliance

The EUDR mandates that certain commodities, including coffee, entering the EU market must be deforestation-free and legally produced. The Beersheba platform automates this compliance process through a rigorous seven-gate validation engine. This engine is a core differentiator of the platform, ensuring that every coffee lot is fully verified before it can be exported.

## 2. The Seven-Gate Validation Engine

The compliance engine evaluates seven distinct criteria, referred to as "gates." A coffee lot must pass all seven gates to be considered ready for export.

### Gate 1: Deforestation Free (`deforestation_free`)

*   **Requirement:** The coffee must not have been produced on land that was deforested after December 31, 2020.
*   **Implementation:** This is a live spatial intersection check. The platform uses PostGIS to compare the `CoffeeLot`'s geospatial `boundary` (a `PolygonField`) against known deforestation areas stored in the `DeforestationZone` model [1, 2].
*   **Status:** `True` if no overlap is detected.

### Gate 2: GPS Verified (`gps_verified`)

*   **Requirement:** The exact location of the farm where the coffee was produced must be recorded.
*   **Implementation:** The platform verifies the presence of valid geospatial data for the lot. This requires either a `farm_location` (a `PointField` for farms under 4 hectares) or a `boundary` (a `PolygonField` for larger farms) [1, 3].
*   **Status:** `True` if valid GPS data is present.

### Gate 3: EUDR DDS Ready (`eudr_dds_ready`)

*   **Requirement:** A Due Diligence Statement (DDS) must be prepared, confirming compliance with EUDR.
*   **Implementation:** The platform generates a PDF document (the DDS) using ReportLab. The generation of this document is strictly gated; the `EudrDdsView` explicitly prevents generation if the `gps_verified` flag is `False` [1, 4].
*   **Status:** `True` if the DDS document has been successfully generated and is ready.

### Gate 4: Phytosanitary Certificate (`phyto_cert_uploaded`)

*   **Requirement:** The coffee must have a valid phytosanitary certificate, ensuring it is free from pests and diseases.
*   **Implementation:** The platform checks for the presence of an uploaded certificate file (`phyto_cert_file`) associated with the `CoffeeLot`. The `save()` method of the `CoffeeLot` model automatically updates this flag based on the file's presence [1, 3].
*   **Status:** `True` if the certificate file is uploaded.

### Gate 5: ECTA Export License (`ecta_license_active`)

*   **Requirement:** The exporter must hold a valid license from the Export Coffee Trade Authority (ECTA).
*   **Implementation:** The platform verifies that the exporter associated with the lot has an active ECTA license recorded in their user profile (`User` model) [1, 5].
*   **Status:** `True` if the exporter's license is active.

### Gate 6: NBE FX Declared (`nbe_fx_declared`)

*   **Requirement:** The foreign exchange (FX) transaction must be declared to the National Bank of Ethiopia (NBE).
*   **Implementation:** The platform checks for the presence of an uploaded NBE FX declaration document (`nbe_fx_declaration_file`). Similar to the phytosanitary certificate, the `save()` method automatically updates this flag [1, 3].
*   **Status:** `True` if the declaration document is uploaded.

### Gate 7: CTA Floor Price Met (`cta_floor_met`)

*   **Requirement:** The export price must meet or exceed the minimum floor price set by the Coffee and Tea Authority (CTA).
*   **Implementation:** The platform compares the lot's `price_per_kg` against the current CTA floor price.
*   **Status:** `True` if the price meets or exceeds the floor price.

## 3. Enforcement Mechanisms

The compliance engine is deeply integrated into the platform's backend logic to ensure strict enforcement.

### 3.1. Pipeline State Guard

The `LotStatusUpdateView` acts as a critical safeguard. It explicitly blocks the transition of a `CoffeeLot`'s status to `exported` unless the lot's `export_ready` property evaluates to `True` [1, 4].

The `export_ready` property is defined on the `CoffeeLot` model and requires all seven gates to be passed:

```python
@property
def export_ready(self):
    return all([
        self.green_passport_ready, # Combines Gates 1, 2, and 3
        self.phyto_cert_uploaded,  # Gate 4
        self.ecta_license_active,  # Gate 5
        self.nbe_fx_declared,      # Gate 6
        self.cta_floor_met,        # Gate 7
    ])
```

### 3.2. PDF Generator Guard

The generation of the EUDR DDS PDF is also protected. The `EudrDdsView` will fail requests to generate the document if the `gps_verified` flag is `False`, ensuring that incomplete data cannot be used to create compliance documentation [1, 4].

### 3.3. Visual Feedback

The frontend provides real-time visual feedback on compliance status. Components like `ComplianceBadge` and the `LotDetail` view display the PASS/FAIL status for each of the seven gates, allowing users to quickly identify missing requirements [1].

## References

[1] `pasted_content.txt` - User-provided project brief and AI context.
[2] `bunna_bridge/bunna_bridge/lots/deforestation.py` - DeforestationZone model definition.
[3] `bunna_bridge/bunna_bridge/lots/models.py` - CoffeeLot model definition.
[4] `bunna_bridge/bunna_bridge/lots/views.py` - Lot-related views, including `LotStatusUpdateView` and `EudrDdsView`.
[5] `bunna_bridge/bunna_bridge/users/models.py` - User model definition, including ECTA license fields.
