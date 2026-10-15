def chronology_warnings(episode) -> list[str]:
    """Flag scenes whose historical events go backwards in time (outside flashbacks)."""
    warnings = []
    latest = None
    for scene in episode.scenes.prefetch_related("facts"):
        if scene.is_flashback:
            continue
        orders = [f.chronology for f in scene.facts.all()]
        if not orders:
            continue
        if latest is not None and min(orders) < latest[0]:
            warnings.append(
                f"La scène « {scene.heading} » montre des événements antérieurs à la scène « {latest[1]} ». "
                "Marquez-la comme retour en arrière ou vérifiez l'ordre."
            )
        if latest is None or max(orders) > latest[0]:
            latest = (max(orders), scene.heading)
    return warnings
