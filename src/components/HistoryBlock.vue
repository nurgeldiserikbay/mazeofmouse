<script lang="ts" setup>
import { useGameStore } from '@/store/gameStore'

const $emits = defineEmits(['close'])

const gameStore = useGameStore()
</script>

<template>
	<div class="history" @click="$emits('close')">
		<div class="container">
			<div class="history__in" @click.stop="">
				<div class="history__title"></div>
				<div class="histories">
					<div class="ht-level">
						<div v-if="gameStore.gameStats?.length" class="ht-level__table">
							<div class="ht-level__row">
								<div class="head">Name</div>
								<div class="head">Score</div>
								<div class="head">Date</div>
							</div>
							<div class="ht-level__row-body">
								<div
									v-for="(item, itemInd) in gameStore.gameStats"
									:key="itemInd"
									class="ht-level__row"
								>
									<div>{{ item.name }}</div>
									<div class="score">{{ item.score }}</div>
									<div class="date">
										{{ `${new Date(item.date).toLocaleDateString()}` }}
									</div>
								</div>
							</div>
						</div>
						<div v-else class="ht-level__record">No Records</div>
					</div>
				</div>
				<button class="history__btn" @click="$emits('close')" />
			</div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
@import '@/assets/_common.scss';

.history {
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
		max-width: 400px;
	}

	&__in {
		position: relative;
		padding: 100px 48px 68px;
		border-radius: 12px;
		height: 60vh;
		width: 100%;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		align-items: center;
		overflow: hidden;
		margin-bottom: 100px;
		background-image: url('@/assets/img/board.png');
		background-size: 100% 100%;
	}

	&__title {
		position: absolute;
		top: 2%;
		font-size: 22px;
		background-image: url('@/assets/img/history.png');
		background-size: contain;
		background-repeat: no-repeat;
		width: 30px;
		height: 30px;
	}

	&__btn {
		display: block;
		background-image: url('@/assets/img/home.png');
		background-size: contain;
		background-repeat: no-repeat;
		width: 52px;
		height: 52px;
		background-color: transparent;
		border-radius: 10px;
		border: none;
		cursor: pointer;
	}
}

.histories {
	position: relative;
	width: 100%;
	height: 60%;
	margin-bottom: 28px;
	flex-grow: 1;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	overflow: hidden;

	&__item {
		width: 100%;
		opacity: 1;
		transition: 0.3s linear;

		&--hide {
			opacity: 0;
			pointer-events: none;
		}

		&--active {
			position: absolute;
			top: 0;
			left: 0;
			right: 0;
			bottom: 0;
		}

		&:last-child {
			margin-bottom: 0;
		}
	}
}

.ht-level {
	flex-grow: 1;
	display: flex;
	flex-direction: column;
	overflow: hidden;

	&__table {
		flex-grow: 1;
		display: flex;
		flex-direction: column;
	}

	&__row {
		display: grid;
		grid-template-columns: 2fr 2fr 3fr;
		gap: 5px;
		align-items: center;
		margin-bottom: 2px;
		padding: 0 5px;

		&:last-child {
			margin-bottom: 0;
		}
	}

	&__row-body {
		flex-grow: 1;
		overflow-y: auto;
		font-size: 16px;
		font-weight: 500;
	}

	&__record {
		text-align: center;
	}

	.head {
		text-align: center;
		font-weight: 600;
	}

	.score {
		text-align: center;
	}

	.date {
		font-size: 16px;
		text-align: center;
	}
}
</style>
