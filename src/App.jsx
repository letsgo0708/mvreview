import { useMemo, useState, useEffect, useRef } from 'react';
import {
  createEmptyMovie,
  formatRating,
  getFilteredMovies,
  getRecentOptions,
  getSummaryActors,
  getVisibleTags,
  normalizeMovieInput,
  toggleSelection,
  validateMovie,
  findExistingOption,
  getAllUniqueOptions,
  getFilteredOptions,
  normalizeKey,
} from './domain';

const defaultFilters = {
  searchQuery: '',
  selectedActors: [],
  selectedTags: [],
  minRating: 0,
  favoriteOnly: false,
  sortBy: 'updated-desc',
};

const ratingOptions = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

function SearchBar({
  searchQuery,
  onSearchChange,
  onOpenForm,
  onToggleFilters,
  isFilterOpen,
  resultCount,
  onExport,
  onImportClick,
}) {
  return (
    <div style={styles.toolbar}>
      <input
        type="text"
        value={searchQuery}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="제목, 배우, 후기, 태그 검색"
        style={{ ...styles.input, ...styles.searchInput }}
      />
      <button type="button" onClick={onToggleFilters} style={styles.secondaryButton}>
        {isFilterOpen ? '필터 닫기' : '필터 열기'}
      </button>
      <button type="button" onClick={onImportClick} style={styles.secondaryButton}>
        불러오기
      </button>
      <button type="button" onClick={onExport} style={styles.secondaryButton}>
        내보내기
      </button>
      <button type="button" onClick={onOpenForm} style={styles.primaryButton}>
        리뷰 추가
      </button>
      <div style={styles.resultCount}>총 {resultCount}개</div>
    </div>
  );
}

function FilterPanel({
  isOpen,
  filters,
  recentActors,
  recentTags,
  onToggleActor,
  onToggleTag,
  onMinRatingChange,
  onFavoriteOnlyChange,
  onSortChange,
  onReset,
}) {
  if (!isOpen) return null;

  return (
    <section style={styles.filterPanel}>
      <div style={styles.filterSection}>
        <div style={styles.filterTitle}>최근 배우</div>
        <div style={styles.chipWrap}>
          {recentActors.length === 0 ? (
            <span style={styles.emptyInlineText}>아직 배우 데이터가 없습니다.</span>
          ) : (
            recentActors.map((actor) => (
              <button
                key={actor}
                type="button"
                onClick={() => onToggleActor(actor)}
                style={{
                  ...styles.chip,
                  ...(filters.selectedActors.includes(actor) ? styles.chipActive : {}),
                }}
              >
                {actor}
              </button>
            ))
          )}
        </div>
      </div>

      <div style={styles.filterSection}>
        <div style={styles.filterTitle}>최근 태그</div>
        <div style={styles.chipWrap}>
          {recentTags.length === 0 ? (
            <span style={styles.emptyInlineText}>아직 태그 데이터가 없습니다.</span>
          ) : (
            recentTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => onToggleTag(tag)}
                style={{
                  ...styles.chip,
                  ...(filters.selectedTags.includes(tag) ? styles.chipActive : {}),
                }}
              >
                {tag}
              </button>
            ))
          )}
        </div>
      </div>

      <div style={styles.filterRow}>
        <label style={styles.fieldLabel}>
          최소 평점
          <select
            value={filters.minRating}
            onChange={(event) => onMinRatingChange(Number(event.target.value))}
            style={styles.select}
          >
            {ratingOptions.map((rating) => (
              <option key={rating} value={rating}>
                {rating === 0 ? '전체' : `${rating} 이상`}
              </option>
            ))}
          </select>
        </label>

        <label style={styles.fieldLabel}>
          정렬
          <select
            value={filters.sortBy}
            onChange={(event) => onSortChange(event.target.value)}
            style={styles.select}
          >
            <option value="updated-desc">최근 수정순</option>
            <option value="rating-desc">평점 높은순</option>
            <option value="play-count-desc">재생횟수 높은순</option>
            <option value="title-asc">제목순</option>
          </select>
        </label>
      </div>

      <div style={styles.filterRow}>
        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={filters.favoriteOnly}
            onChange={(event) => onFavoriteOnlyChange(event.target.checked)}
          />
          즐겨찾기만 보기
        </label>
        <button type="button" onClick={onReset} style={styles.textButton}>
          필터 초기화
        </button>
      </div>
    </section>
  );
}

function ActiveFilterChips({ filters, onRemoveActor, onRemoveTag, onResetRating, onResetFavorite }) {
  const hasFilters =
    filters.selectedActors.length > 0 ||
    filters.selectedTags.length > 0 ||
    filters.minRating > 0 ||
    filters.favoriteOnly;

  if (!hasFilters) return null;

  return (
    <div style={styles.activeChipBar}>
      {filters.selectedActors.map((actor) => (
        <button key={`actor-${actor}`} type="button" onClick={() => onRemoveActor(actor)} style={styles.activeChip}>
          배우: {actor} ×
        </button>
      ))}

      {filters.selectedTags.map((tag) => (
        <button key={`tag-${tag}`} type="button" onClick={() => onRemoveTag(tag)} style={styles.activeChip}>
          태그: {tag} ×
        </button>
      ))}

      {filters.minRating > 0 && (
        <button type="button" onClick={onResetRating} style={styles.activeChip}>
          평점 {filters.minRating} 이상 ×
        </button>
      )}

      {filters.favoriteOnly && (
        <button type="button" onClick={onResetFavorite} style={styles.activeChip}>
          즐겨찾기만 ×
        </button>
      )}
    </div>
  );
}

function MovieList({
  movies,
  onSelectMovie,
  onEditMovie,
  onDeleteMovie,
  onToggleFavorite,
  onIncrementPlayCount,
}) {
  if (movies.length === 0) {
    return <div style={styles.emptyState}>조건에 맞는 리뷰가 없습니다.</div>;
  }

  return (
    <div style={styles.list}>
      {movies.map((movie) => (
        <MovieListItem
          key={movie.id}
          movie={movie}
          onSelect={() => onSelectMovie(movie)}
          onEdit={() => onEditMovie(movie)}
          onDelete={() => onDeleteMovie(movie.id)}
          onToggleFavorite={() => onToggleFavorite(movie.id)}
          onIncrementPlayCount={() => onIncrementPlayCount(movie.id)}
        />
      ))}
    </div>
  );
}

function MovieListItem({
  movie,
  onSelect,
  onEdit,
  onDelete,
  onToggleFavorite,
  onIncrementPlayCount,
}) {
  const visibleTags = getVisibleTags(movie.tags);
  const hiddenCount = movie.tags.length - visibleTags.length;

  return (
    <article style={styles.listItem}>
      <button type="button" onClick={onSelect} style={styles.listItemMain}>
        <div style={styles.listTopRow}>
          <div style={styles.mainInfoRow}>
            <span style={styles.titleText}>{movie.title}</span>
            {movie.year ? <span style={styles.yearText}>({movie.year})</span> : null}
            <span style={styles.actorInlineText}>· &nbsp;{getSummaryActors(movie.actors)}</span>
          </div>
        </div>

        <div style={styles.tagRow}>
          {visibleTags.map((tag) => (
            <span key={tag} style={styles.smallTag}>
              {tag}
            </span>
          ))}

          {hiddenCount > 0 && (
            <span title={movie.tags.join(', ')} style={styles.moreTag}>
              +{hiddenCount}
            </span>
          )}
        </div>

      </button>

      <div style={styles.itemActions}>
        <div style={styles.ratingBlock}>
            <span style={styles.ratingText}>{formatRating(movie.rating)}</span>
            <span style={styles.playCountText}>· 재생 {movie.playCount || 0}회</span>
            <span
              onClick={onIncrementPlayCount}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#e0e7ff')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              style={styles.playCountButton}
            >
              +1
            </span>
          </div>
        
        <button type="button" onClick={onToggleFavorite} style={styles.iconButton}>
          {movie.favorite ? '★' : '☆'}
        </button>
        <button type="button" onClick={onEdit} style={styles.iconButton}>
          수정
        </button>
        <button type="button" onClick={onDelete} style={styles.iconButtonDanger}>
          삭제
        </button>
      </div>
    </article>
  );
}

function MovieFormModal({
  mode,
  values,
  errors,
  recentActors,
  recentTags,
  allActors,
  allTags,
  onChange,
  onToggleActor,
  onToggleTag,
  onSubmit,
  onClose,
}) {
  return (
    <div style={styles.backdrop}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>{mode === 'edit' ? '리뷰 수정' : '리뷰 추가'}</h2>
          <button type="button" onClick={onClose} style={styles.closeButton}>
            닫기
          </button>
        </div>

        <div style={styles.formGrid}>
          <label style={styles.fieldLabel}>
            제목
            <input
              type="text"
              value={values.title}
              onChange={(event) => onChange('title', event.target.value)}
              style={styles.input}
            />
            {errors.title ? <span style={styles.errorText}>{errors.title}</span> : null}
          </label>

          <label style={styles.fieldLabel}>
            연도
            <input
              type="text"
              value={values.year}
              onChange={(event) => onChange('year', event.target.value)}
              placeholder="선택 입력"
              style={styles.input}
            />
            {errors.year ? <span style={styles.errorText}>{errors.year}</span> : null}
          </label>

          <PresetSelector
            label="최근 배우"
            selectedItems={values.actors}
            recentItems={recentActors}
            allOptions={allActors}
            placeholder="배우를 입력하고 Enter"
            onToggleItem={onToggleActor}
            onCreateItem={(value) => onToggleActor(value)}
          />

          <PresetSelector
            label="최근 태그"
            selectedItems={values.tags}
            recentItems={recentTags}
            allOptions={allTags}
            placeholder="태그를 입력하고 Enter"
            onToggleItem={onToggleTag}
            onCreateItem={(value) => onToggleTag(value)}
          />

          <label style={styles.fieldLabel}>
            평점 (0.5 단위)
            <select
              value={values.rating}
              onChange={(event) => onChange('rating', event.target.value)}
              style={styles.select}
            >
              {ratingOptions.map((rating) => (
                <option key={rating} value={rating}>
                  {rating}
                </option>
              ))}
            </select>
            {errors.rating ? <span style={styles.errorText}>{errors.rating}</span> : null}
          </label>

          <label style={styles.fieldLabel}>
            재생횟수
            <input
              type="number"
              min="0"
              value={values.playCount}
              onChange={(event) => onChange('playCount', event.target.value)}
              style={styles.input}
            />
            {errors.playCount ? <span style={styles.errorText}>{errors.playCount}</span> : null}
          </label>

          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={values.favorite}
              onChange={(event) => onChange('favorite', event.target.checked)}
            />
            즐겨찾기
          </label>

          <label style={styles.fieldLabelFull}>
            후기
            <textarea
              value={values.review}
              onChange={(event) => onChange('review', event.target.value)}
              rows={6}
              style={styles.textarea}
            />
          </label>
        </div>

        <div style={styles.modalActions}>
          <button type="button" onClick={onClose} style={styles.secondaryButton}>
            취소
          </button>
          <button type="button" onClick={onSubmit} style={styles.primaryButton}>
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

function PresetSelector({
  label,
  selectedItems,
  recentItems,
  allOptions,
  placeholder,
  onToggleItem,
  onCreateItem,
}) {
  const [inputValue, setInputValue] = useState('');

  const suggestions = useMemo(() => {
    return getFilteredOptions(allOptions || [], inputValue).filter(
      (option) =>
        !selectedItems.some(
          (selected) => normalizeKey(selected) === normalizeKey(option)
        )
    );
  }, [allOptions, inputValue, selectedItems]);

  const addInputValue = () => {
    const next = inputValue.trim();
    if (!next) return;
    onCreateItem(next);
    setInputValue('');
  };

  return (
    <div style={styles.fieldLabelFull}>
      <div style={styles.fieldLabelText}>{label}</div>

      {recentItems.length > 0 ? (
        <>
          <div style={styles.chipWrap}>
            {recentItems.map((item) => {
              const isSelected = selectedItems.some(
                (selected) => normalizeKey(selected) === normalizeKey(item)
              );

              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => onToggleItem(item)}
                  style={{
                    ...styles.chip,
                    ...(isSelected ? styles.chipActive : {}),
                  }}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </>
      ) : null}

      <div style={styles.inlineInputRow}>
        <input
          type="text"
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              addInputValue();
            }
          }}
          placeholder={placeholder}
          style={styles.input}
        />
        <button type="button" onClick={addInputValue} style={styles.secondaryButton}>
          추가
        </button>
      </div>

      {inputValue.trim() ? (
        <div>
          <div style={styles.subtleLabel}>기존 항목 추천</div>
          <div style={styles.chipWrap}>
            {suggestions.length > 0 ? (
              suggestions.slice(0, 8).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    onCreateItem(item);
                    setInputValue('');
                  }}
                  style={styles.chip}
                >
                  {item}
                </button>
              ))
            ) : (
              <span style={styles.emptyInlineText}>
                일치하는 기존 항목이 없어요. Enter로 새로 추가할 수 있어요.
              </span>
            )}
          </div>
        </div>
      ) : null}

      <div style={styles.activeChipBar}>
        {selectedItems.map((item) => (
          <button key={item} type="button" onClick={() => onToggleItem(item)} style={styles.activeChip}>
            {item} ×
          </button>
        ))}
      </div>
    </div>
  );
}

function MovieDetailModal({ movie, onClose, onEdit }) {
  return (
    <div style={styles.backdrop}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <div>
            <h2 style={styles.modalTitle}>
              {movie.title} {movie.year ? `(${movie.year})` : ''}
            </h2>
            <div style={styles.detailRating}>{formatRating(movie.rating)}</div>
            <div style={styles.detailMeta}>재생 {movie.playCount || 0}회</div>
          </div>
          <button type="button" onClick={onClose} style={styles.closeButton}>
            닫기
          </button>
        </div>

        <div style={styles.detailSection}>
          <div style={styles.detailLabel}>배우</div>
          <div>{movie.actors.length ? movie.actors.join(', ') : '없음'}</div>
        </div>

        <div style={styles.detailSection}>
          <div style={styles.detailLabel}>태그</div>
          <div style={styles.chipWrap}>
            {movie.tags.length ? (
              movie.tags.map((tag) => <span key={tag} style={styles.smallTag}>{tag}</span>)
            ) : (
              <span>없음</span>
            )}
          </div>
        </div>

        <div style={styles.detailSection}>
          <div style={styles.detailLabel}>후기</div>
          <p style={styles.reviewText}>{movie.review || '후기가 없습니다.'}</p>
        </div>

        <div style={styles.modalActions}>
          <button type="button" onClick={() => onEdit(movie)} style={styles.primaryButton}>
            수정
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [movies, setMovies] = useState(() => {
    const saved = localStorage.getItem('movies');
    if (!saved) return [];

    try {
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];

      return parsed.map((movie) => ({
        ...movie,
        actors: movie.actors || [],
        tags: movie.tags || [],
        rating: Number(movie.rating) || 0,
        playCount: Math.max(0, Number(movie.playCount) || 0),
        favorite: Boolean(movie.favorite),
        createdAt: movie.createdAt || new Date().toISOString(),
        updatedAt: movie.updatedAt || new Date().toISOString(),
      }));
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('movies', JSON.stringify(movies));
  }, [movies]);

  const [filters, setFilters] = useState(defaultFilters);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [formMode, setFormMode] = useState('create');
  const [editingMovieId, setEditingMovieId] = useState(null);
  const [formValues, setFormValues] = useState(createEmptyMovie());
  const [formErrors, setFormErrors] = useState({});
  const [isFormOpen, setIsFormOpen] = useState(false);
  const fileInputRef = useRef(null);

  const filteredMovies = useMemo(() => getFilteredMovies(movies, filters), [movies, filters]);
  const recentActors = useMemo(() => getRecentOptions(movies, 'actors'), [movies]);
  const recentTags = useMemo(() => getRecentOptions(movies, 'tags'), [movies]);
  const allActors = useMemo(() => getAllUniqueOptions(movies, 'actors'), [movies]);
  const allTags = useMemo(() => getAllUniqueOptions(movies, 'tags'), [movies]);

  const openCreateForm = () => {
    setFormMode('create');
    setEditingMovieId(null);
    setFormValues(createEmptyMovie());
    setFormErrors({});
    setIsFormOpen(true);
  };

  const openEditForm = (movie) => {
    setSelectedMovie(null);
    setFormMode('edit');
    setEditingMovieId(movie.id);
    setFormValues({
      title: movie.title,
      year: movie.year || '',
      actors: movie.actors,
      tags: movie.tags,
      rating: movie.rating,
      playCount: movie.playCount || 0,
      review: movie.review,
      favorite: movie.favorite,
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setFormErrors({});
  };

  const handleFormChange = (field, value) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleToggleFormActor = (actor) => {
    const existing = findExistingOption(allActors, actor);
    const finalActor = existing || actor.trim();

    if (!finalActor) return;

    setFormValues((prev) => {
      const alreadyExists = prev.actors.some(
        (item) => normalizeKey(item) === normalizeKey(finalActor)
      );

      return {
        ...prev,
        actors: alreadyExists
          ? prev.actors.filter(
              (item) => normalizeKey(item) !== normalizeKey(finalActor)
            )
          : [...prev.actors, finalActor],
      };
    });
  };

  const handleToggleFormTag = (tag) => {
    const existing = findExistingOption(allTags, tag);
    const finalTag = existing || tag.trim();

    if (!finalTag) return;

    setFormValues((prev) => {
      const alreadyExists = prev.tags.some(
        (item) => normalizeKey(item) === normalizeKey(finalTag)
      );

      return {
        ...prev,
        tags: alreadyExists
          ? prev.tags.filter(
              (item) => normalizeKey(item) !== normalizeKey(finalTag)
            )
          : [...prev.tags, finalTag],
      };
    });
  };

  const handleSubmitForm = () => {
    const errors = validateMovie(formValues);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const normalized = normalizeMovieInput(formValues);
    const timestamp = new Date().toISOString();

    if (formMode === 'create') {
      const nextMovie = {
        id: Date.now(),
        ...normalized,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      setMovies((prev) => [nextMovie, ...prev]);
    } else {
      setMovies((prev) =>
        prev.map((movie) =>
          movie.id === editingMovieId
            ? { ...movie, ...normalized, updatedAt: timestamp }
            : movie
        )
      );
    }

    closeForm();
  };

  const handleDeleteMovie = (id) => {
    const confirmed = window.confirm('이 리뷰를 삭제할까요?');
    if (!confirmed) return;

    setMovies((prev) => prev.filter((movie) => movie.id !== id));
    if (selectedMovie?.id === id) {
      setSelectedMovie(null);
    }
  };

  const handleToggleFavorite = (id) => {
    const timestamp = new Date().toISOString();
    setMovies((prev) =>
      prev.map((movie) =>
        movie.id === id
          ? { ...movie, favorite: !movie.favorite, updatedAt: timestamp }
          : movie
      )
    );
  };

  const handleIncrementPlayCount = (id) => {
    const timestamp = new Date().toISOString();

    setMovies((prev) =>
      prev.map((movie) =>
        movie.id === id
          ? {
              ...movie,
              playCount: (movie.playCount || 0) + 1,
              updatedAt: timestamp,
            }
          : movie
      )
    );

    setSelectedMovie((prev) =>
      prev?.id === id
        ? {
            ...prev,
            playCount: (prev.playCount || 0) + 1,
            updatedAt: timestamp,
          }
        : prev
    );
  };

  const handleExportMovies = () => {
    const dataStr = JSON.stringify(movies, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    const today = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `movie-reviews-${today}.json`;
    link.click();

    URL.revokeObjectURL(url);
  };

  const handleImportMovies = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);

        if (!Array.isArray(parsed)) {
          window.alert('올바른 JSON 배열 파일이 아닙니다.');
          return;
        }

        const confirmed = window.confirm(
          '현재 데이터를 불러온 파일 내용으로 교체할까요?'
        );
        if (!confirmed) return;

        const normalizedMovies = parsed.map((movie) => ({
          ...movie,
          actors: movie.actors || [],
          tags: movie.tags || [],
          rating: Number(movie.rating) || 0,
          playCount: Math.max(0, Number(movie.playCount) || 0),
          favorite: Boolean(movie.favorite),
          createdAt: movie.createdAt || new Date().toISOString(),
          updatedAt: movie.updatedAt || new Date().toISOString(),
        }));

        setMovies(normalizedMovies);
        
        window.alert('불러오기가 완료되었습니다.');
      } catch (error) {
        window.alert('JSON 파일을 읽는 중 오류가 발생했습니다.');
      } finally {
        event.target.value = '';
      }
    };

    reader.readAsText(file);
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <h1 style={styles.heading}>영화 리뷰 관리</h1>
          <p style={styles.subheading}>빠르게 기록하고, 빠르게 찾는 개인 영화 리뷰 앱</p>
        </header>

        <SearchBar
          searchQuery={filters.searchQuery}
          onSearchChange={(value) => setFilters((prev) => ({ ...prev, searchQuery: value }))}
          onOpenForm={openCreateForm}
          onToggleFilters={() => setIsFilterOpen((prev) => !prev)}
          isFilterOpen={isFilterOpen}
          resultCount={filteredMovies.length}
          onExport={handleExportMovies}
          onImportClick={() => fileInputRef.current?.click()}
        />

        <FilterPanel
          isOpen={isFilterOpen}
          filters={filters}
          recentActors={recentActors}
          recentTags={recentTags}
          onToggleActor={(actor) =>
            setFilters((prev) => ({
              ...prev,
              selectedActors: toggleSelection(prev.selectedActors, actor),
            }))
          }
          onToggleTag={(tag) =>
            setFilters((prev) => ({
              ...prev,
              selectedTags: toggleSelection(prev.selectedTags, tag),
            }))
          }
          onMinRatingChange={(value) => setFilters((prev) => ({ ...prev, minRating: value }))}
          onFavoriteOnlyChange={(value) =>
            setFilters((prev) => ({ ...prev, favoriteOnly: value }))
          }
          onSortChange={(value) => setFilters((prev) => ({ ...prev, sortBy: value }))}
          onReset={() =>
            setFilters((prev) => ({
              ...defaultFilters,
              searchQuery: prev.searchQuery,
            }))
          }
        />

        <ActiveFilterChips
          filters={filters}
          onRemoveActor={(actor) =>
            setFilters((prev) => ({
              ...prev,
              selectedActors: prev.selectedActors.filter((item) => item !== actor),
            }))
          }
          onRemoveTag={(tag) =>
            setFilters((prev) => ({
              ...prev,
              selectedTags: prev.selectedTags.filter((item) => item !== tag),
            }))
          }
          onResetRating={() => setFilters((prev) => ({ ...prev, minRating: 0 }))}
          onResetFavorite={() => setFilters((prev) => ({ ...prev, favoriteOnly: false }))}
        />

        <MovieList
          movies={filteredMovies}
          onSelectMovie={setSelectedMovie}
          onEditMovie={openEditForm}
          onDeleteMovie={handleDeleteMovie}
          onToggleFavorite={handleToggleFavorite}
          onIncrementPlayCount={handleIncrementPlayCount}
        />
      </div>

      {isFormOpen ? (
        <MovieFormModal
          mode={formMode}
          values={formValues}
          errors={formErrors}
          recentActors={recentActors}
          recentTags={recentTags}
          allActors={allActors}
          allTags={allTags}
          onChange={handleFormChange}
          onToggleActor={handleToggleFormActor}
          onToggleTag={handleToggleFormTag}
          onSubmit={handleSubmitForm}
          onClose={closeForm}
        />
      ) : null}

      {selectedMovie ? (
        <MovieDetailModal
          movie={selectedMovie}
          onClose={() => setSelectedMovie(null)}
          onEdit={openEditForm}
        />
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        onChange={handleImportMovies}
        style={{ display: 'none' }}
      />

    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f5f7fb',
    color: '#162033',
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
    padding: '32px 16px',
  },
  container: {
    maxWidth: 920,
    margin: '0 auto',
  },
  header: {
    marginBottom: 24,
  },
  heading: {
    margin: 0,
    fontSize: 28,
    fontWeight: 800,
  },
  subheading: {
    marginTop: 8,
    marginBottom: 0,
    color: '#58627a',
  },
  toolbar: {
    display: 'grid',
    gridTemplateColumns: '1fr auto auto auto auto auto',
    gap: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  resultCount: {
    color: '#58627a',
    fontSize: 14,
    textAlign: 'right',
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid #d4d9e5',
    borderRadius: 10,
    padding: '10px 12px',
    fontSize: 14,
    background: '#fff',
  },
  textarea: {
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid #d4d9e5',
    borderRadius: 12,
    padding: '12px 14px',
    fontSize: 14,
    background: '#fff',
    resize: 'vertical',
  },
  searchInput: {
    minWidth: 0,
  },
  select: {
    border: '1px solid #d4d9e5',
    borderRadius: 10,
    padding: '10px 12px',
    fontSize: 14,
    background: '#fff',
  },
  primaryButton: {
    border: 'none',
    borderRadius: 10,
    padding: '10px 14px',
    background: '#1d4ed8',
    color: '#fff',
    fontWeight: 700,
    cursor: 'pointer',
  },
  secondaryButton: {
    border: '1px solid #c9d3ea',
    borderRadius: 10,
    padding: '10px 14px',
    background: '#fff',
    color: '#183153',
    fontWeight: 600,
    cursor: 'pointer',
  },
  textButton: {
    border: 'none',
    background: 'transparent',
    color: '#1d4ed8',
    fontWeight: 700,
    cursor: 'pointer',
    padding: 0,
  },
  filterPanel: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    boxShadow: '0 8px 22px rgba(15, 23, 42, 0.05)',
  },
  filterSection: {
    marginBottom: 16,
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 8,
  },
  chipWrap: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    border: '1px solid #d4d9e5',
    borderRadius: 999,
    padding: '6px 10px',
    background: '#fff',
    cursor: 'pointer',
    fontSize: 13,
  },
  chipActive: {
    background: '#e7f0ff',
    borderColor: '#8db3ff',
    color: '#1e40af',
    fontWeight: 700,
  },
  activeChipBar: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  activeChip: {
    border: 'none',
    borderRadius: 999,
    padding: '7px 11px',
    background: '#dbeafe',
    color: '#1d4ed8',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 700,
  },
  filterRow: {
    display: 'flex',
    gap: 16,
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  fieldLabel: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    fontSize: 14,
    fontWeight: 600,
    minWidth: 180,
  },
  fieldLabelFull: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    width: '100%',
    fontSize: 14,
    fontWeight: 600,
  },
  fieldLabelText: {
    fontSize: 14,
    fontWeight: 600,
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 14,
    fontWeight: 600,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  listItem: {
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    gap: 12,
    background: '#fff',
    borderRadius: 14,
    border: '1px solid #e2e8f0',
    padding: 14,
    boxShadow: '0 8px 22px rgba(15, 23, 42, 0.04)',
    alignItems: 'center',
  },
  listItemMain: {
    border: 'none',
    background: 'transparent',
    padding: 0,
    textAlign: 'left',
    cursor: 'pointer',
  },
  listTopRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 8,
  },
  titleBlock: {
    display: 'flex',
    gap: 8,
    alignItems: 'baseline',
    minWidth: 0,
  },
  titleText: {
    fontWeight: 800,
    fontSize: 17,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  yearText: {
    color: '#64748b',
    fontSize: 14,
    flexShrink: 0,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: 800,
    color: '#cc2432',
    flexShrink: 0,
  },
  tagRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  smallTag: {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: 999,
    background: '#f1f5f9',
    color: '#334155',
    fontSize: 12,
    fontWeight: 700,
    padding: '5px 9px',
  },
  itemActions: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  iconButton: {
    border: '1px solid #d4d9e5',
    borderRadius: 10,
    padding: '8px 10px',
    background: '#fff',
    cursor: 'pointer',
    fontWeight: 700,
  },
  iconButtonDanger: {
    border: '1px solid #fecaca',
    color: '#b91c1c',
    borderRadius: 10,
    padding: '8px 10px',
    background: '#fff',
    cursor: 'pointer',
    fontWeight: 700,
  },
  emptyState: {
    background: '#fff',
    border: '1px dashed #cbd5e1',
    borderRadius: 16,
    padding: '32px 20px',
    color: '#64748b',
    textAlign: 'center',
  },
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    zIndex: 1000,
  },
  modal: {
    width: '100%',
    maxWidth: 680,
    maxHeight: '90vh',
    overflowY: 'auto',
    background: '#fff',
    borderRadius: 18,
    padding: 20,
    boxShadow: '0 24px 60px rgba(15, 23, 42, 0.2)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 18,
  },
  modalTitle: {
    margin: 0,
    fontSize: 24,
    fontWeight: 800,
  },
  closeButton: {
    border: '1px solid #d4d9e5',
    background: '#fff',
    borderRadius: 10,
    padding: '8px 12px',
    cursor: 'pointer',
    fontWeight: 700,
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 16,
  },
  inlineInputRow: {
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    gap: 10,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 12,
    fontWeight: 600,
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20,
  },
  detailSection: {
    marginBottom: 18,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: 800,
    color: '#475569',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  detailRating: {
    marginTop: 6,
    color: '#cc2432',
    fontWeight: 800,
  },
  reviewText: {
    margin: 0,
    whiteSpace: 'pre-wrap',
    lineHeight: 1.6,
    color: '#1f2937',
  },
  emptyInlineText: {
    fontSize: 13,
    color: '#64748b',
  },
  mainInfoRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 8,
    minWidth: 0,
    flexWrap: 'wrap',
  },
  actorInlineText: {
    fontSize: 14,
    color: '#475569',
    minWidth: 0,
  },
  subtleLabel: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 8,
  },
  metaRow: {
    marginTop: 8,
    fontSize: 13,
    color: '#64748b',
    fontWeight: 600,
  },

  detailMeta: {
    marginTop: 4,
    color: '#64748b',
    fontSize: 14,
    fontWeight: 600,
  },

  ratingBlock: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },

  playCountText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: 600,
  },
  playCountButton: {
    fontSize: 13,
    fontWeight: 700,
    color: '#2563eb',
    cursor: 'pointer',
    padding: '1px 4px',
    borderRadius: 6,
    lineHeight: 1.2,
  },
  moreTag: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: 600,
    padding: '2px 8px',
  },
};
