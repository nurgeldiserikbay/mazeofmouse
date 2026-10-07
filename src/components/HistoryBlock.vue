<script lang="ts" setup>
import { useGameStore } from '@/store/gameStore'

const $emits = defineEmits(['close'])

const gameStore = useGameStore()
</script>

<template>
	<div class="history" @click="$emits('close')">
		<div class="history__in" @click.stop="">
			<div class="history__title">{{ $t('history') }}</div>

			<div v-if="gameStore.gameStats?.length" class="ht">
				<div class="ht__row ht__row--head">
					<div>{{ $t('name') }}</div>
					<div>{{ $t('score') }}</div>
					<div>{{ $t('date') }}</div>
				</div>
				<div class="ht__body">
					<div
						v-for="(item, itemInd) in gameStore.gameStats"
						:key="itemInd"
						class="ht__row"
						:class="{ 'ht__row--top': itemInd < 3 }"
					>
						<div class="ht__name">
							<span class="ht__place">{{ itemInd + 1 }}</span>
							{{ item.name }}
						</div>
						<div class="ht__score">{{ item.score }}</div>
						<div class="ht__date">
							{{ new Date(item.date).toLocaleDateString() }}
						</div>
					</div>
				</div>
			</div>
			<div v-else class="ht__empty">{{ $t('noRecords') }}</div>

			<button class="history__btn" :aria-label="'home'" @click="$emits('close')">
				<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3.2 2.2 11.6h3V20.5h5.2v-5.6h3.2v5.6h5.2v-8.9h3z" stroke="currentColor" stroke-width="1" stroke-linejoin="round" /></svg>
			</button>
		</div>
	</div>
</template>

<style lang="scss" scoped>
@use '@/assets/common' as *;

.history {
	@include modal-shade(1000);

	&__in {
		@include modal-card;
		max-width: 380px;
		max-height: 78dvh;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 14px;
	}

	&__title {
		@include modal-title;
	}

	&__btn {
		@include icon-button;
		flex-shrink: 0;
	}
}

.ht {
	width: 100%;
	min-height: 0;
	display: flex;
	flex-direction: column;

	&__body {
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding-bottom: 4px;
	}

	&__row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 54px 92px;
		gap: 6px;
		align-items: center;
		padding: 8px 10px;
		background: #fffaf0;
		border: 2px solid $creamEdge;
		border-radius: 10px;
		box-shadow: 0 2px 0 $creamEdge;
		font-size: 15px;

		&--head {
			background: none;
			border: none;
			box-shadow: none;
			padding: 0 12px 6px;
			font-size: 12px;
			font-weight: 700;
			text-transform: uppercase;
			letter-spacing: 0.5px;
			color: rgba(74, 42, 16, 0.6);

			div:not(:first-child) {
				text-align: center;
			}
		}

		&--top .ht__place {
			background: $sun;
			border-color: $sunEdge;
		}
	}

	&__name {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-weight: 700;
	}

	&__place {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 22px;
		height: 22px;
		margin-right: 6px;
		border: 2px solid $creamEdge;
		border-radius: 50%;
		background: $cream;
		font-size: 12px;
		font-weight: 800;
		vertical-align: middle;
	}

	&__score {
		text-align: center;
		font-size: 18px;
		font-weight: 900;
		color: $leafEdge;
	}

	&__date {
		text-align: center;
		font-size: 13px;
		color: rgba(74, 42, 16, 0.7);
	}

	&__empty {
		padding: 20px 0;
		font-size: 16px;
		font-weight: 600;
		color: rgba(74, 42, 16, 0.7);
	}
}
</style>
