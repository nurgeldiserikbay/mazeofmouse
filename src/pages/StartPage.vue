<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import { useAudio } from '@/composables/useAudio'
import { PAGES } from '@/utils/conts'

import { usePageStore } from '@/store/pageStore'
import { useGameStore } from '@/store/gameStore'

import UiButton from '@/components/UiButton.vue'
import StartModal from '@/components/StartModal.vue'
import HistoryBlock from '@/components/HistoryBlock.vue'
import OtherGames from '@/components/OtherGames.vue'
import OtherGamesIcon from '@/components/OtherGamesIcon.vue'

const {
	play,
	stop,
	toggleMusic,
	toggleAudio,
	playAudio,
	musicActive,
	audioActive,
} = useAudio()

const pageStore = usePageStore()
const gameStore = useGameStore()

const isStart = ref(false)
const isHistory = ref(false)
const isOtherGames = ref(false)

/**
 * Незаконченный забег, к которому можно вернуться.
 *
 * Ноль означает «продолжать нечего»: так его оставляет проигрыш и начало новой
 * игры. Выход в меню, наоборот, прогресс сохраняет — ради этого кнопка и есть.
 */
const canContinue = computed(() => gameStore.currentLevel > 0)

/** Уровень показываем человеку, а не индексом с нуля. */
const continueLevel = computed(() => gameStore.currentLevel + 1)

// Мимо StartModal: имя уже сохранено в прошлый заход, а спрашивать его снова
// значило бы начать новую партию.
function continueGame() {
	playAudio('click')
	pageStore.routeTo(PAGES.PLAYGROUND)
}

// Новая игра идёт через модалку с именем, и она же сбрасывает прогресс.
function openNewGame() {
	playAudio('click')
	isStart.value = true
}

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
				<div class="start-page__right">
					<button
						:class="{ active: audioActive }"
						class="start-page__sound"
						@click="toggleAudio(), playAudio('click')"
					></button>
					<!-- Вход в «Другие игры». Рядом с кнопкой звука и с той же
					     приглушённостью: раздел не должен спорить за внимание с
					     кнопкой Start. -->
					<button
						class="start-page__games"
						:aria-label="$t('otherGames')"
						@click=";(isOtherGames = true), playAudio('click')"
					>
						<OtherGamesIcon />
					</button>
				</div>
			</div>
		</div>

		<div class="start-page__logo">
			<img src="@/assets/img/mouse.png" alt="mouse" class="mouse" />
			<span>Maze <span>Of</span> Mouse</span>
			<img src="@/assets/img/cat.png" alt="cat" class="cat" />
		</div>

		<div class="start-page__btns">
			<!--
				Главная кнопка остаётся одна и с прежней подписью: незаконченный
				забег она продолжает, а если продолжать нечего — начинает новый.
				Отдельная кнопка «Продолжить» тут не годилась: слово длиннее
				«Играть» и на любом языке вылезало за края деревянной рамки.
				Что именно продолжится, говорит подпись под кнопкой.
			-->
			<UiButton @click="canContinue ? continueGame() : openNewGame()">
				{{ $t('start') }}
			</UiButton>

			<div v-if="canContinue" class="start-page__hint">
				{{ $t('continueFrom', { level: continueLevel }) }}
			</div>

			<!-- Начать сначала можно только когда есть что терять. -->
			<UiButton
				v-if="canContinue"
				:bg="'grey'"
				:width="120"
				:size="'small'"
				@click="openNewGame"
			>
				{{ $t('restart') }}
			</UiButton>

			<UiButton
				:bg="'grey'"
				:width="120"
				:size="'small'"
				@click=";(isHistory = true), playAudio('click')"
			>
				{{ $t('history') }}
			</UiButton>
		</div>

		<a
			href="https://docs.google.com/document/d/1DOfHLx0DSwtIGCbjJMWeCGWkfBDVH26vuCuaNO0CO4Q/edit?usp=sharing"
			target="_blank"
			class="privacy"
			>{{ $t('privacyPolicy') }}</a
		>

		<StartModal
			v-if="isStart"
			@close=";(isStart = false), playAudio('click')"
		/>
		<HistoryBlock
			v-if="isHistory"
			@close=";(isHistory = false), playAudio('click')"
		/>
		<OtherGames
			v-if="isOtherGames"
			@close=";(isOtherGames = false), playAudio('click')"
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

	/* Звук и «Другие игры» держатся вместе у правого края: иначе
	   space-between растащил бы три кнопки по краям и середине. */
	&__right {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	&__games {
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: transparent;
		color: #fff;

		svg {
			width: 26px;
			height: 26px;
		}
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

	/* Подпись стоит внутри колонки кнопок и прижата к своей кнопке: снаружи её
	   растаскивал space-between самой страницы, и номер лабиринта повисал
	   посреди пустого экрана, ни к чему не относясь. */
	&__hint {
		margin-top: -18px;
		font-size: 14px;
		letter-spacing: 1px;
		color: rgba(255, 255, 255, 0.8);
		text-align: center;
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
	// Перевод длиннее английского оригинала (ru: «Политика конфиденциальности»),
	// поэтому строке разрешено переноситься и она не может вылезти за экран.
	max-width: 90vw;
	text-align: center;
	line-height: 1.4;
}
</style>
