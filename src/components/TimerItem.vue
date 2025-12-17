<script lang="ts" setup>
import { onBeforeUnmount, onMounted, ref, computed, watch } from 'vue'
import { useAudio } from '@/composables/useAudio'


const $props = defineProps<{
	level: number
	showCat: boolean
}>()

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
	if ($props.level > 15) return 400
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
		<div
			class="time__in"
			:style="{
				width: getWidth,
			}"
		>
			<img v-if="showCat" src="@/assets/img/cat.png" alt="cat" />
		</div>
	</div>
</template>

<style lang="scss" scoped>
.time {
	width: 80%;
	font-size: 14px;
	box-sizing: border-box;
	height: 20px;
	text-align: center;
	border-radius: 25px;
	border: 1px solid hsl(115, 64%, 35%);

	&__in {
		position: relative;
		border-radius: 25px;
		height: 100%;
		background: hsl(127, 67%, 58%);
		filter: drop-shadow(0 0 5px hsl(106, 74%, 63%));

		img {
			position: absolute;
			height: 150%;
			right: 0;
			transform: translate(50%, -20%);
		}
	}
}
</style>
