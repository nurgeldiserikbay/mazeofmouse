<script lang="ts" setup>
import { onBeforeUnmount, onMounted, ref, computed, watch } from 'vue'
import { useAudio } from '@/composables/useAudio'


const $props = withDefaults(
	defineProps<{
		level: number
		showCat: boolean
		// Пауза на время показа полноэкранной рекламы. Таймер перезапускается по
		// watch на level, поэтому без паузы игрок терял бы время на планирование
		// ровно на длительность объявления.
		paused?: boolean
	}>(),
	{ paused: false }
)

const $emits = defineEmits(['timeend'])

let timerId: ReturnType<typeof setInterval> | undefined
	const audioCont = useAudio()

const date = ref(0)
const getTimeValue = computed(() => {
	// if ($props.level > 60) return 100
	// if ($props.level > 50) return 150
	// if ($props.level > 30) return 200
	// if ($props.level > 25) return 250
	// if ($props.level > 20) return 300
	if ($props.level > 10) return 400
	if ($props.level > 5) return 450

	return 500
})
const getWidth = computed(() => {
	return `${(date.value / getTimeValue.value) * 100}%`
})

watch(
	() => $props.level,
	() => {
		clearTimer()
		createTimer()
	}
)
watch(
	() => $props.showCat,
	() => {
		if (!$props.showCat) audioCont.stop('catWait')
	}
)
// Под объявлением звук ожидания кота не должен идти поверх рекламы.
watch(
	() => $props.paused,
	(paused) => {
		if (paused) audioCont.stop('catWait')
		else if ($props.showCat && date.value > 0) audioCont.play('catWait')
	}
)

onMounted(() => {
	createTimer()
})

onBeforeUnmount(() => {
	clearTimer()
	audioCont.stop('catWait')
})

function createTimer() {
	clearTimer()
	audioCont.play('catWait')
	date.value = getTimeValue.value
	timerId = setInterval(() => {
		if ($props.paused) return

		date.value -= 1
		if (date.value === 0) {
			clearTimer()
			$emits('timeend')
			audioCont.stop('catWait')
		}
	}, 100)
}

function clearTimer() {
	if (timerId) clearInterval(timerId)
}
</script>

<template>
	<div class="time">
		<div class="time__track">
			<div class="time__in" :style="{ width: getWidth }"></div>
		</div>
		<img v-if="showCat" class="time__cat" src="@/assets/img/v2/token-cat.webp" alt="cat" />
	</div>
</template>

<style lang="scss" scoped>
@use '@/assets/common' as *;

/* Кот сидит на конце жёлоба и ждёт: когда полоса дойдёт до нуля, он
   выбежит на поле. Полоса уходит влево, к старту. */
.time {
	position: relative;
	flex: 1;
	margin-left: 12px;
	padding-right: 26px;

	&__track {
		@include wood(14px);
		height: 26px;
		padding: 4px;
		box-sizing: border-box;
	}

	&__in {
		height: 100%;
		border-radius: 8px;
		background: linear-gradient(180deg, #8be04f, #4fae22);
		box-shadow: inset 0 -3px 0 rgba(0, 0, 0, 0.15);
		transition: width 0.1s linear;
	}

	&__cat {
		position: absolute;
		right: -4px;
		top: 50%;
		width: 52px;
		height: 52px;
		transform: translateY(-58%);
		filter: drop-shadow(0 3px 0 rgba(60, 30, 5, 0.35));
	}
}
</style>
