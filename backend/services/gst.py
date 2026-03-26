from typing import Dict
from config import GST_RATES


def calculate_gst(taxable_amount: float, gst_rate: float, is_interstate: bool) -> Dict:
    """
    Calculate GST components based on transaction type.
    - Intra-state: CGST + SGST
    - Inter-state: IGST
    """
    rate_key = str(int(gst_rate))
    rates = GST_RATES.get(rate_key, {"cgst": gst_rate / 2, "sgst": gst_rate / 2, "igst": gst_rate})

    if is_interstate:
        igst = round(taxable_amount * rates["igst"] / 100, 2)
        return {
            "cgst_rate": 0, "cgst_amount": 0,
            "sgst_rate": 0, "sgst_amount": 0,
            "igst_rate": rates["igst"], "igst_amount": igst,
            "total_tax": igst,
            "gross_amount": round(taxable_amount + igst, 2),
        }
    else:
        cgst = round(taxable_amount * rates["cgst"] / 100, 2)
        sgst = round(taxable_amount * rates["sgst"] / 100, 2)
        total = cgst + sgst
        return {
            "cgst_rate": rates["cgst"], "cgst_amount": cgst,
            "sgst_rate": rates["sgst"], "sgst_amount": sgst,
            "igst_rate": 0, "igst_amount": 0,
            "total_tax": total,
            "gross_amount": round(taxable_amount + total, 2),
        }


def is_interstate_transaction(from_state_code: str, to_state_code: str) -> bool:
    return from_state_code.strip().upper() != to_state_code.strip().upper()
