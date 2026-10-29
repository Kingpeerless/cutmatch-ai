export function matchesFacialHairVisibility(
  photo: { facialHairVisible?: boolean },
  onlyVisible: boolean,
) {
  return !onlyVisible || photo.facialHairVisible === true;
}

export function matchesHairstylePhotoSearch(
  photo: { title: string; categoryLabel: string; categories: readonly string[] },
  query: string,
) {
  const search = query.trim().toLowerCase();
  return (
    !search ||
    [photo.title, photo.categoryLabel, ...photo.categories].some((value) =>
      value.toLowerCase().includes(search),
    )
  );
}
