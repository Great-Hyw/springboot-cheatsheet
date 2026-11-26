import { computed, ref } from 'vue'

const ANN_KEY = 'sb-fav-annotations'
const KN_KEY = 'sb-fav-knowledge'

function load(key) {
  try {
    const raw = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(raw) ? raw.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

const favAnnotations = ref(load(ANN_KEY))
const favKnowledge = ref(load(KN_KEY))

function persist(key, list) {
  try {
    localStorage.setItem(key, JSON.stringify(list))
  } catch {
    /* ignore */
  }
}

export function useFavorites() {
  const total = computed(() => favAnnotations.value.length + favKnowledge.value.length)

  function isFav(type, id) {
    return (type === 'annotation' ? favAnnotations.value : favKnowledge.value).includes(id)
  }

  function toggleFav(type, id) {
    if (!id) return false
    const target = type === 'annotation' ? favAnnotations : favKnowledge
    const key = type === 'annotation' ? ANN_KEY : KN_KEY
    const idx = target.value.indexOf(id)
    if (idx >= 0) target.value.splice(idx, 1)
    else target.value.unshift(id)
    persist(key, target.value)
    return idx < 0
  }

  return { favAnnotations, favKnowledge, total, isFav, toggleFav }
}