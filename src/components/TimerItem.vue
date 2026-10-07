<script lang="ts" setup>
import { onBeforeUnmount, onMounted, ref, computed, watch } from 'vue'
import { useAudio } from '@/composables/useAudio'
import { STAR_MARKS } from '@/pages/helpers'


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

/** Доля оставшегося времени — по ней страница считает звёзды за уровень. */
const fraction = computed(() => date.value / getTimeValue.value)
defineExpose({ fraction })

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
			<!-- Отметки звёзд: пока полоса правее отметки, звезда ещё твоя. -->
			<span
				v-for="mark in STAR_MARKS"
				:key="mark"
				class="time__star"
				:class="{ lost: fraction < mark }"
				:style="{ left: `${mark * 100}%` }"
			>
				<svg viewBox="0 0 24 24"><path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9z" /></svg>
			</span>
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
		position: relative;
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

	&__star {
		position: absolute;
		top: 50%;
		width: 22px;
		height: 22px;
		transform: translate(-50%, -50%);
		transition: transform 0.2s, opacity 0.2s;

		svg {
			width: 100%;
			height: 100%;
			fill: $sun;
			stroke: $woodEdge;
			stroke-width: 1.8;
			stroke-linejoin: round;
		}

		&.lost {
			opacity: 0.45;
			transform: translate(-50%, -50%) scale(0.8);

			svg {
				fill: #8a6a4a;
			}
		}
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
