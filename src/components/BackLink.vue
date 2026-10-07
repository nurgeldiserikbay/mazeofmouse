<script lang="ts" setup>
import { usePageStore } from '@/store/pageStore'
import { useAudio } from '@/composables/useAudio'

/**
 * `confirm` — не уходить самим, а только сообщить о намерении. Нужен на игровом
 * экране: там уход стоит партии, и спрашивать должен тот, кто про эту партию
 * знает. Без пропа кнопка работает как раньше.
 */
const $props = withDefaults(defineProps<{ confirm?: boolean }>(), {
	confirm: false,
})

const $emits = defineEmits(['request'])

const pageStore = usePageStore()
const audioCont = useAudio()

function back() {
	audioCont.playAudio('click')

	if ($props.confirm) {
		$emits('request')
		return
	}

	pageStore.toBackLink()
}
</script>

<template>
	<button class="back-link" :aria-label="'back'" @click="back">
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H6" /><path d="M11 6l-6 6 6 6" /></svg>
	</button>
</template>

<style lang="scss" scoped>
@use '@/assets/common' as *;

.back-link {
	@include chunky($woodFace, $woodEdge, 4px, 12px);
	flex-shrink: 0;
	width: 50px;
	height: 50px;
	padding: 0 0 3px;
	display: flex;
	align-items: center;
	justify-content: center;
	outline: none;
	color: $cream;
	background: linear-gradient(180deg, $woodLight, $woodFace);
	-webkit-tap-highlight-color: transparent;

	svg {
		width: 28px;
		height: 28px;
	}
}
</style>
