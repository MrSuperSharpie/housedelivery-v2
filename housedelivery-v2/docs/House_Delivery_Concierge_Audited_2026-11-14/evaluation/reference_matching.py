"""Deterministic comparison reference; consumes approved records, never web content.

Intent extraction and session memory belong in the application. This helper assumes
validated constraints, and separates qualifying matches from optional alternatives.
"""
from decimal import Decimal

def to_sqft(value, unit):
    n = Decimal(str(value))
    if not n.is_finite() or n <= 0:
        raise ValueError('Area must be finite and positive')
    normalized = unit.lower().strip()
    if normalized in ('m2', 'm²', 'sqm', 'square metres', 'square meters'):
        return float(n / Decimal('0.09290304'))
    if normalized in ('sf', 'sqft', 'sq ft', 'sq. ft.', 'square feet'):
        return float(n)
    raise ValueError('Unsupported area unit')

def shortlist(models, *, family='architectural', units=1, bedrooms=None,
              minimum_bedrooms=False, bathrooms_min=None, storeys=None,
              bedrooms_per_unit=None, target_sqft=None, max_sqft=None,
              min_sqft=None, area_basis='published', tolerance=0.10, limit=2):
    if tolerance < 0 or limit < 1 or area_basis not in ('published', 'internal'):
        raise ValueError('Invalid search policy')
    for value in (target_sqft, max_sqft, min_sqft):
        if value is not None and (not Decimal(str(value)).is_finite() or value <= 0):
            raise ValueError('Invalid area constraint')
    if min_sqft is not None and max_sqft is not None and min_sqft > max_sqft:
        raise ValueError('Inverted area range')
    has_area = any(v is not None for v in (target_sqft, max_sqft, min_sqft))
    ranked = []
    for m in models:
        if family == 'compact':
            if not (m['family'] == 'laneway_carriage' or
                    (m['family'] == 'cmhc_catalogue' and m['units'] == 1)):
                continue
        elif m['family'] != family:
            continue
        if units is not None and m['units'] != units:
            continue
        if bedrooms is not None:
            # Single-home bedroom counts must never be compared with building totals.
            b = m.get('bedrooms')
            if m['units'] != 1 or b is None or (b < bedrooms if minimum_bedrooms else b != bedrooms):
                continue
        if bedrooms_per_unit is not None:
            schedule = m.get('unit_schedule', [])
            if len(schedule) != m['units'] or not all(u['bedrooms'] == bedrooms_per_unit for u in schedule):
                continue
        if bathrooms_min is not None:
            if m['units'] != 1 or m.get('bathrooms') is None or m['bathrooms'] < bathrooms_min:
                continue
        if storeys is not None and m.get('storeys') != storeys:
            continue
        area = m.get('internal_area_sqft_approx') if area_basis == 'internal' else m.get('area_sqft')
        if has_area and (area is None or not m['numeric_area_matching_allowed']):
            continue
        if max_sqft is not None and area > max_sqft:
            continue
        if min_sqft is not None and area < min_sqft:
            continue
        distance = abs(area - target_sqft) if target_sqft is not None else 0
        ranked.append((distance, m['id'], m))
    ranked.sort(key=lambda v: (v[0], v[1]))
    matches, alternatives = [], []
    for distance, _, model in ranked:
        if target_sqft is None or distance <= target_sqft * tolerance:
            matches.append(model)
        else:
            alternatives.append(model)
    return {'matches': matches[:limit], 'outside_target_alternatives': alternatives[:limit],
            'area_basis': area_basis, 'tolerance': tolerance}

def illustrative_total(area, rate):
    """Arithmetic only. Calling code must NOT promote it into a model quotation."""
    a, r = Decimal(str(area)), Decimal(str(rate))
    if not a.is_finite() or not r.is_finite() or a <= 0 or r <= 0:
        raise ValueError('Positive finite inputs required')
    return a * r
