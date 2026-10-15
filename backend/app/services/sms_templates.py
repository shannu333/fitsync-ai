"""
SMS Notification Templates — Stage 7
====================================
Bilingual Kisan SMS alert templates (Telugu & English) compliant with
Indian DLT guidelines for agricultural advisories.
"""

def render_sms_template(
    farmer_name: str,
    farm_name: str,
    stress_category: str,
    risk_level: str,
    language: str = "Telugu",
    extra_data: dict = None,
) -> str:
    """
    Renders tailored SMS advisory based on stress cause and farmer preferred language.
    """
    is_te = language.lower() in ["telugu", "te"]
    extra = extra_data or {}

    first_name = farmer_name.split()[0] if farmer_name else "రైతు"

    if "Drought" in stress_category or "Water Stress" in stress_category or "Moisture" in stress_category:
        if is_te:
            return (
                f"[రైస్ పల్స్ హెచ్చరిక] నమస్కారం {first_name} గారు, మీ '{farm_name}' పొలంలో శాటిలైట్ పరిశీలనలో తేమ కొరత (కరువు ఒత్తిడి) "
                f"గుర్తించబడింది. వెంటనే 2-3 అంగుళాల మేర నీరు పారించండి. రసాయన ఎరువులు వేయరాదు. - RBK & RicePulse AP"
            )
        else:
            return (
                f"[RicePulse Alert] Dear {first_name}, moisture stress detected in your '{farm_name}' paddy field via satellite. "
                f"Initiate 2-3 inches standing water irrigation immediately. Avoid top-dressing urea. - RBK & RicePulse AP"
            )

    elif "Heat" in stress_category:
        tmax = extra.get("max_temp_c", 36.0)
        if is_te:
            return (
                f"[రైస్ పల్స్ హెచ్చరిక] నమస్కారం {first_name} గారు, మీ ప్రాంతంలో అధిక ఉష్ణోగ్రత ({tmax}°C) నమోదవుతోంది. "
                f"పూత రాలకుండా పొలంలో 5 సెం.మీ నీరు నిల్వ ఉంచండి. సాయంత్రం మాత్రమే నీరు పెట్టండి. - RBK & RicePulse AP"
            )
        else:
            return (
                f"[RicePulse Alert] Dear {first_name}, extreme heat ({tmax}°C) detected over '{farm_name}'. "
                f"Maintain 5 cm standing water to cool root zone and irrigate in cool evening hours. - RBK & RicePulse AP"
            )

    elif "Waterlogging" in stress_category or "Rainfall" in stress_category or "Flood" in stress_category:
        rain = extra.get("rain_7d_mm", 90.0)
        if is_te:
            return (
                f"[రైస్ పల్స్ హెచ్చరిక] నమస్కారం {first_name} గారు, మీ '{farm_name}' చేనులో భారీ వర్షాల వల్ల ({rain}mm) ముంపు ప్రమాదం ఉంది. "
                f"మురుగు కాల్వలను తెరిచి వెంటనే నీటిని బయటకు పంపండి. అగ్గితెగులు రాకుండా గమనించండి. - RBK & RicePulse AP"
            )
        else:
            return (
                f"[RicePulse Alert] Dear {first_name}, waterlogging risk detected at '{farm_name}' following heavy rainfall ({rain}mm). "
                f"Clear drainage channels immediately to prevent root damage. - RBK & RicePulse AP"
            )

    elif "Pest" in stress_category or "Biotic" in stress_category or "Anomaly" in stress_category:
        if is_te:
            return (
                f"[రైస్ పల్స్ హెచ్చరిక] నమస్కారం {first_name} గారు, మీ '{farm_name}' పొలంలో శాటిలైట్ పచ్చదనం తగ్గింది. "
                f"కాండం తొలిచే పురుగు లేదా సుడిదోమ ఆశించే అవకాశం ఉంది. వెంటనే చేనును దగ్గరుండి పరిశీలించండి. - RBK & RicePulse AP"
            )
        else:
            return (
                f"[RicePulse Alert] Dear {first_name}, satellite canopy anomaly detected at '{farm_name}'. "
                f"Scout your field immediately for Stem Borer dead-hearts or Brown Planthopper. - RBK & RicePulse AP"
            )

    else:
        # Routine check / optimal
        if is_te:
            return (
                f"[రైస్ పల్స్ సమాచారం] నమస్కారం {first_name} గారు, మీ '{farm_name}' వరి చేను ఆరోగ్యంగా ఉంది. "
                f"ప్రస్తుత తడి-ఆరబెట్టు (AWD) నీటి యాజమాన్యాన్ని కొనసాగించండి. శుభం. - RBK & RicePulse AP"
            )
        else:
            return (
                f"[RicePulse Advisory] Dear {first_name}, '{farm_name}' is currently in healthy condition. "
                f"Continue your alternate wetting and drying schedule. - RBK & RicePulse AP"
            )
