<script lang="ts" setup>
import { onMounted, ref } from 'vue'

import { CUSTOM_NAMES, PAGES } from '@/utils/conts'

import { usePageStore } from '@/store/pageStore'
import { useGameStore } from '@/store/gameStore'
import { randomInt } from '@/pages/game'

const pageStore = usePageStore()
const gameStore = useGameStore()

const $emits = defineEmits(['close'])

const name = ref('')

onMounted(() => {
	generateCustomName()
})

function generateCustomName() {
	name.value = CUSTOM_NAMES[randomInt(0, CUSTOM_NAMES.length - 1)]
	saveName()
}

function saveName() {
	if (!name.value) return

	gameStore.setName(name.value)
}

function change(event: Event) {
	const target = event.target as HTMLInputElement

	if (target) {
		if (target.value.length > 12) target.value = target.value.slice(0, 12)
		name.value = target.value
	}
}

async function startGame() {
	saveName()
	await gameStore.loadData()

	if (!gameStore.tutorialPassed) {
		gameStore.currentLevel = 0
	}

	pageStore.routeTo(PAGES.PLAYGROUND)
}
</script>

<template>
	<div class="desc" @click="$emits('close')">
		<div class="container">
			<div class="desc__in" @click.stop="">
				<div class="desc__input">
					<input
						:value="name"
						type="text"
						class="desc__input-body"
						@input="change"
						@keypress.enter="saveName"
					/>
				</div>
				<button class="desc__btn" @click="startGame"></button>
			</div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
@import '@/assets/_common.scss';

.desc {
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
	justify-content: center;
	align-items: center;

	.container {
		width: 100%;
		max-width: 400px;
	}

	&__in {
		padding: 60px 28px 48px;
		border-radius: 12px;
		height: 60vh;
		width: 100%;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		justify-content: space-around;
		align-items: center;
		overflow: hidden;
		margin-bottom: 15px;
		background-image: url('@/assets/img/modal-bg.png');
		background-size: 100% 100%;
	}

	&__input {
		display: flex;
	}

	&__input-body {
		width: 250px;
		background-image: url('@/assets/img/input.png');
		background-size: contain;
		aspect-ratio: 4.4;
		border: none;
		outline: none;
		background-color: transparent;
		font-size: 18px;
		color: #fff;
		padding: 2px 25px;
		box-sizing: border-box;
		font-family: inherit;
		letter-spacing: 2px;
	}

	&__btn {
		display: block;
		background-image: url('@/assets/img/start.png');
		background-size: contain;
		width: 66px;
		height: 66px;
		flex-shrink: 0;
		background-color: transparent;
		border-radius: 10px;
		border: none;
		cursor: pointer;
	}
}
</style>
