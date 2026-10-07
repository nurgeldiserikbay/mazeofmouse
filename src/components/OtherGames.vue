<script lang="ts" setup>
import { ref } from 'vue'

import ParentGate from '@/components/ParentGate.vue'

import { PROMO_GAMES, promoIcon, storeUrl } from '@/utils/promo'
import type { I_PromoGame } from '@/utils/promo'

/**
 * Раздел «Другие игры» — наши же игры одним списком.
 *
 * Единственное место, откуда можно уйти в Google Play: и кнопка в меню, и
 * полоса кросс-промо на игровом экране ведут сюда, а не наружу. Так случайное
 * касание ребёнка стоит ему закрытия модалки, а не ухода из приложения.
 *
 * Сам уход — только через родительский гейт (ParentGate.vue).
 */
const $emits = defineEmits(['close'])

/** Игра, для которой открыт гейт. `null` — гейт закрыт. */
const pending = ref<I_PromoGame | null>(null)
</script>

<template>
	<div class="games" @click="$emits('close')">
		<div class="games__in" @click.stop="">
			<div class="games__title">{{ $t('otherGames') }}</div>
			<div class="games__note">{{ $t('otherGamesNote') }}</div>

			<div class="games__list">
				<button
					v-for="game in PROMO_GAMES"
					:key="game.appId"
					class="game"
					@click="pending = game"
				>
					<img
						class="game__icon"
						:src="promoIcon(game)"
						:alt="game.title"
						width="44"
						height="44"
					/>
					<span class="game__title">{{ game.title }}</span>
					<span class="game__go">{{ $t('promoOpen') }}</span>
				</button>
			</div>

			<button class="games__btn" :aria-label="'home'" @click="$emits('close')">
				<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3.2 2.2 11.6h3V20.5h5.2v-5.6h3.2v5.6h5.2v-8.9h3z" stroke="currentColor" stroke-width="1" stroke-linejoin="round" /></svg>
			</button>
		</div>

		<ParentGate
			v-if="pending"
			:href="storeUrl(pending)"
			:title="pending.title"
			@close="pending = null"
		/>
	</div>
</template>

<style lang="scss" scoped>
@use '@/assets/common' as *;

.games {
	@include modal-shade(1100);

	&__in {
		@include modal-card;
		max-width: 380px;
		max-height: 80dvh;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	&__title {
		@include modal-title;
	}

	/* Пометка обязательна: по Families Policy своя реклама — такая же реклама,
	   и раздел не должен выглядеть частью игрового контента. */
	&__note {
		margin: -6px 0 12px;
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 1px;
		text-transform: uppercase;
		color: rgba(74, 42, 16, 0.6);
		text-align: center;
	}

	&__list {
		width: 100%;
		min-height: 0;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin-bottom: 16px;
		padding-bottom: 4px;
	}

	&__btn {
		@include icon-button;
		flex-shrink: 0;
	}
}

.game {
	display: flex;
	align-items: center;
	gap: 10px;
	width: 100%;
	box-sizing: border-box;
	padding: 8px 10px;
	background: #fffaf0;
	border: 2px solid $creamEdge;
	border-radius: 12px;
	box-shadow: 0 3px 0 $creamEdge;
	text-align: left;
	cursor: pointer;
	color: $ink;
	font-family: $font;

	&:active {
		transform: translateY(2px);
		box-shadow: 0 1px 0 $creamEdge;
	}

	&__icon {
		flex: 0 0 44px;
		width: 44px;
		height: 44px;
		border-radius: 10px;
		box-shadow: 0 0 0 2px $creamEdge;
	}

	&__title {
		flex: 1;
		min-width: 0;
		font-size: 15px;
		font-weight: 700;
		line-height: 1.25;
	}

	&__go {
		flex: 0 0 auto;
		padding: 6px 10px 7px;
		border: 2px solid $sunEdge;
		border-radius: 10px;
		box-shadow: 0 2px 0 $sunEdge;
		font-size: 11px;
		font-weight: 800;
		letter-spacing: 0.6px;
		text-transform: uppercase;
		color: $ink;
		background: $sun;
	}
}
</style>
