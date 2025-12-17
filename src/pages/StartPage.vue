<script lang="ts" setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'

import { useAudio } from '@/composables/useAudio'
import { PAGES } from '@/utils/conts'

import UiButton from '@/components/UiButton.vue'
import StartModal from '@/components/StartModal.vue'
import HistoryBlock from '@/components/HistoryBlock.vue'

const {
	play,
	stop,
	toggleMusic,
	toggleAudio,
	playAudio,
	musicActive,
	audioActive,
} = useAudio()

const isStart = ref(false)
const isHistory = ref(false)

onMounted(() => {
	play('menuMusic')
})

onBeforeUnmount(() => {
	stop('menuMusic')
})
</script>

<template>
	<div class="page start-page">
		<div class="start-page__head">
			<div class="container">
				<button
					:class="{ active: musicActive }"
					class="start-page__music"
					@click="toggleMusic(), playAudio('click')"
				></button>
				<button
					:class="{ active: audioActive }"
					class="start-page__sound"
					@click="toggleAudio(), playAudio('click')"
				></button>
			</div>
		</div>

		<div class="start-page__logo">
			<img src="@/assets/img/mouse.png" alt="mouse" class="mouse" />
			<span>Maze <span>Of</span> Mouse</span>
			<img src="@/assets/img/cat.png" alt="cat" class="cat" />
		</div>

		<div class="start-page__btns">
			<UiButton @click=";(isStart = true), playAudio('click')">
				Start
			</UiButton>
			<UiButton
				:bg="'grey'"
				:width="120"
				:size="'small'"
				@click=";(isHistory = true), playAudio('click')"
			>
				History
			</UiButton>
		</div>

		<a
			href="https://docs.google.com/document/d/1DOfHLx0DSwtIGCbjJMWeCGWkfBDVH26vuCuaNO0CO4Q/edit?usp=sharing"
			target="_blank"
			class="privacy"
			>Privacy Policy</a
		>

		<StartModal
			v-if="isStart"
			@close=";(isStart = false), playAudio('click')"
		/>
		<HistoryBlock
			v-if="isHistory"
			@close=";(isHistory = false), playAudio('click')"
		/>
	</div>
</template>

<style lang="scss" scoped>
.start-page {
	position: relative;
	padding-top: 100px;
	padding-bottom: 40px;
	height: 100vh;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	align-items: center;
	gap: 12px;
	max-width: 480px;
	margin: 0 auto;

	&__head {
		position: absolute;
		top: 10px;
		width: 100%;

		.container {
			display: flex;
			justify-content: space-between;
		}

		button {
			width: 46px;
			height: 46px;
			border-radius: 8px;
			border: none;
			outline: none;
			cursor: pointer;
			opacity: 0.5;
			transition: 0.3s linear;

			&.active {
				opacity: 1;
			}
		}
	}

	&__music {
		background-image: url('@/assets/img/music.png');
		background-size: cover;
		background-color: transparent;
	}

	&__sound {
		background-image: url('@/assets/img/sound.png');
		background-size: cover;
		background-color: transparent;
	}

	&__logo {
		max-width: 300px;
		position: relative;
		color: rgb(254, 206, 13);
		text-align: center;
		letter-spacing: 3px;
		-webkit-text-stroke: 2px rgb(45, 128, 0);
		text-stroke: 2px rgb(45, 128, 0);
		font-size: 42px;

		span {
			span {
				font-size: 32px;
			}
		}

		.mouse,
		.cat {
			position: absolute;
			width: 65px;
			height: 65px;
			z-index: -1;
		}

		.mouse {
			top: -35%;
			left: 12%;
			width: 55px;
			height: 55px;
			z-index: 10;
			animation: slowMove 10s linear 0.2s infinite;
		}

		.cat {
			right: 18%;
			animation: slowMove 10s linear infinite;
		}
	}

	&__btns {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		align-items: center;
		gap: 28px;
	}
}

@keyframes slowMove {
	0% {
		transform: translate(-2px, -8px);
	}
	10% {
		transform: translate(3px, 8px);
	}
	20% {
		transform: translate(0, -5px);
	}
	30% {
		transform: translate(6px, 6px);
	}
	40% {
		transform: translate(-3px, -6px);
	}
	50% {
		transform: translate(3px, 4px);
	}
	60% {
		transform: translate(5px, -6px);
	}
	70% {
		transform: translate(-5px, 7px);
	}
	80% {
		transform: translate(0, -5px);
	}
	90% {
		transform: translate(3px, 7px);
	}
	100% {
		transform: translate(-2px, -5px);
	}
}

.privacy {
	display: block;
	margin: 25px auto;
	font-size: 16px;
	color: #ffdc16;
	text-decoration: none;
	letter-spacing: 5px;
}
</style>
