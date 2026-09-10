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
		<div class="container">
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

				<button class="games__btn" @click="$emits('close')" />
			</div>
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
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 1100;
	background: $bgColor;
	background: $bgGrad;
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
		padding: 70px 26px 24px;
		border-radius: 12px;
		height: 76vh;
		width: 100%;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		align-items: center;
		overflow: hidden;
		background-image: url('@/assets/img/board.png');
		background-size: 100% 100%;
	}

	&__title {
		font-size: 22px;
		color: #ffdc16;
		text-align: center;
	}

	/* Пометка обязательна: по Families Policy своя реклама — такая же реклама,
	   и раздел не должен выглядеть частью игрового контента. */
	&__note {
		margin: 4px 0 14px;
		font-size: 11px;
		letter-spacing: 1px;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.6);
		text-align: center;
	}

	&__list {
		flex-grow: 1;
		width: 100%;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin-bottom: 16px;
	}

	&__btn {
		display: block;
		flex: 0 0 auto;
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

.game {
	display: flex;
	align-items: center;
	gap: 10px;
	width: 100%;
	box-sizing: border-box;
	padding: 8px 10px;
	border: none;
	border-radius: 12px;
	text-align: left;
	cursor: pointer;
	color: #fff;
	background: rgba(0, 0, 0, 0.35);

	&:active {
		background: rgba(0, 0, 0, 0.5);
	}

	&__icon {
		flex: 0 0 44px;
		width: 44px;
		height: 44px;
		border-radius: 10px;
		box-shadow: 0 0 0 1.5px rgba(255, 255, 255, 0.14);
	}

	&__title {
		flex: 1;
		min-width: 0;
		font-size: 14px;
		line-height: 1.25;
	}

	&__go {
		flex: 0 0 auto;
		padding: 6px 10px;
		border-radius: 10px;
		font-size: 11px;
		letter-spacing: 0.8px;
		text-transform: uppercase;
		color: #241806;
		background: #ffdc16;
	}
}
</style>
