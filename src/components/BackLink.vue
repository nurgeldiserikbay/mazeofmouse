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
	<button class="back-link" @click="back">
		<img src="@/assets/img/exit.png" alt="exit" />
	</button>
</template>

<style lang="scss" scoped>
.back-link {
	background: transparent;
	padding: 0;
	border: none;
	outline: none;
	cursor: pointer;

	img {
		width: 50px;
		height: 50px;
	}
}
</style>
