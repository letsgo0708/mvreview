export function createEmptyMovie() {
  return {
    title: '',
    year: '',
    actors: [],
    tags: [],
    rating: 0,
    playCount: 0,
    review: '',
    favorite: false,
  };
}

export function normalizeMovieInput(values) {
  return {
    title: values.title.trim(),
    year: values.year === '' ? '' : Number(values.year),
    actors: dedupeStrings(values.actors || []),
    tags: dedupeStrings(values.tags || []),
    rating: Number(values.rating) || 0,
    playCount: Math.max(0, Number(values.playCount) || 0),
    review: values.review.trim(),
    favorite: Boolean(values.favorite),
  };
}

export function validateMovie(values) {
  const errors = {};

  if (!values.title.trim()) {
    errors.title = '제목은 필수입니다.';
  }

  if (values.year !== '' && Number.isNaN(Number(values.year))) {
    errors.year = '연도는 숫자여야 합니다.';
  }

  if (Number(values.rating) < 0 || Number(values.rating) > 5) {
    errors.rating = '평점은 0점에서 5점 사이여야 합니다.';
  }

  if (values.playCount !== '' && Number.isNaN(Number(values.playCount))) {
    errors.playCount = '재생횟수는 숫자여야 합니다.';
  }

  if (Number(values.playCount) < 0) {
    errors.playCount = '재생횟수는 0 이상이어야 합니다.';
  }

  if (Number(values.rating) % 0.5 !== 0) {
    errors.rating = '평점은 0.5 단위여야 합니다.';
  }

  return errors;
}

export function getFilteredMovies(movies, filters) {
  const query = filters.searchQuery.trim().toLowerCase();

  return [...movies]
    .filter((movie) => {
      const matchesQuery =
        !query ||
        movie.title.toLowerCase().includes(query) ||
        movie.review.toLowerCase().includes(query) ||
        movie.actors.some((actor) => actor.toLowerCase().includes(query)) ||
        movie.tags.some((tag) => tag.toLowerCase().includes(query));

      const matchesActors =
        filters.selectedActors.length === 0 ||
        filters.selectedActors.every((actor) => movie.actors.includes(actor));

      const matchesTags =
        filters.selectedTags.length === 0 ||
        filters.selectedTags.every((tag) => movie.tags.includes(tag));

      const matchesRating = movie.rating >= filters.minRating;
      const matchesFavorite = !filters.favoriteOnly || movie.favorite;

      return (
        matchesQuery &&
        matchesActors &&
        matchesTags &&
        matchesRating &&
        matchesFavorite
      );
    })
    .sort((a, b) => {
      if (filters.sortBy === 'play-count-desc') {
        return (b.playCount || 0) - (a.playCount || 0)
          || new Date(b.updatedAt) - new Date(a.updatedAt);
      }

      if (filters.sortBy === 'rating-desc') {
        return b.rating - a.rating || new Date(b.updatedAt) - new Date(a.updatedAt);
      }

      if (filters.sortBy === 'title-asc') {
        return a.title.localeCompare(b.title);
      }

      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });
}

export function getRecentOptions(movies, field, limit = 8) {
  const seen = new Set();
  const ordered = [...movies].sort(
    (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
  );

  const result = [];

  for (const movie of ordered) {
    for (const item of movie[field] || []) {
      const key = item.trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      result.push(key);
      if (result.length >= limit) return result;
    }
  }

  return result;
}

export function toggleSelection(list, value) {
  if (list.includes(value)) {
    return list.filter((item) => item !== value);
  }

  return [...list, value];
}

export function getSummaryActors(actors) {
  if (!actors.length) return '배우 정보 없음';
  if (actors.length <= 2) return actors.join(', ');
  return `${actors[0]} 외 ${actors.length - 1}`;
}

export function getVisibleTags(tags, limit = 3) {
  return tags.slice(0, limit);
}

export function formatRating(rating) {
  return `${Number(rating).toFixed(1)}점`;
}

function dedupeStrings(items) {
  return Array.from(
    new Set(
      items
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

export function normalizeKey(value) {
  return String(value).trim().toLowerCase();
}

export function findExistingOption(options, input) {
  const inputKey = normalizeKey(input);
  return options.find((option) => normalizeKey(option) === inputKey) || null;
}

export function getAllUniqueOptions(movies, field) {
  const map = new Map();

  movies.forEach((movie) => {
    (movie[field] || []).forEach((item) => {
      const trimmed = String(item).trim();
      if (!trimmed) return;

      const key = normalizeKey(trimmed);
      if (!map.has(key)) {
        map.set(key, trimmed);
      }
    });
  });

  return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
}

export function getFilteredOptions(options, query) {
  const q = normalizeKey(query);
  if (!q) return options;
  return options.filter((option) => normalizeKey(option).includes(q));
}