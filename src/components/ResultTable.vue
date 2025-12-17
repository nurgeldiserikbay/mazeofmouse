<script lang="ts" setup>
import { onMounted, ref } from 'vue'

import { useGameStore } from '@/store/gameStore'
import { CUSTOM_NAMES } from '@/utils/conts'
import { randomInt } from '@/pages/game'

withDefaults(
	defineProps<{
		result: number
	}>(),
	{}
)

const $emits = defineEmits(['close'])

const gameStore = useGameStore()

const name = ref('')

onMounted(() => {
	if (gameStore.name) name.value = gameStore.name
	else generateCustomName()
})

function generateCustomName() {
	name.value = CUSTOM_NAMES[randomInt(0, CUSTOM_NAMES.length - 1)]
	gameStore.setName(name.value)
}
</script>

<template>
	<div class="result">
		<div class="container">
			<div class="result__in">
				<div class="result__title">Your Score</div>
				<div class="result__table">
					<div>{{ name }}</div>
					<div>{{ result }}</div>
				</div>
				<button class="result__btn" @click="$emits('close')" />
			</div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
@import '@/assets/_common.scss';

.result {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 1000;
	background: $bgColor;
	background: $bgGrad;
	box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.4),
		inset 0px -2px 4px rgba(255, 255, 255, 0.2);
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;

	.container {
		width: 100%;
		max-width: 350px;
	}

	&__in {
		position: relative;
		padding: 65px 28px 68px;
		border-radius: 12px;
		height: 60vh;
		width: 100%;
		box-sizing: border-box;
		display: flex;
		justify-content: space-around;
		flex-direction: column;
		align-items: center;
		overflow: hidden;
		margin-bottom: 100px;
		background-image: url('@/assets/img/board.png');
		background-size: 100% 100%;
	}

	&__title {
		position: absolute;
		top: 3%;
		font-size: 22px;
	}

	&__table {
		width: 70%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-grow: 1;
		padding-bottom: 30px;
		letter-spacing: 3px;

		div {
			&:last-child {
				font-size: 25px;
			}
		}
	}

	&__btn {
		flex-shrink: 0;
		display: block;
		background-image: url('@/assets/img/home.png');
		background-size: contain;
		background-repeat: no-repeat;
		width: 66px;
		height: 66px;
		background-color: transparent;
		border-radius: 10px;
		border: none;
		cursor: pointer;
	}
}
</style>
