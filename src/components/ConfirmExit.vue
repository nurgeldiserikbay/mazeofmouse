<script lang="ts" setup>
import UiButton from '@/components/UiButton.vue'

/**
 * Подтверждение выхода с игрового экрана.
 *
 * Раньше кнопка «домой» уводила в меню сразу и молча — одно случайное касание
 * стоило партии. Прогресс при выходе сохраняется (обнуляет его только
 * проигрыш), поэтому подпись говорит именно это: уйти не страшно.
 *
 * Оформление повторяет модалку «Новый лабиринт» — это здешний язык диалогов:
 * затемнение, крупный жёлтый заголовок с зелёной обводкой прямо поверх игры и
 * деревянные кнопки. Рамка board.png тут не годится: у неё сверху декоративная
 * табличка под заголовок, и текст, поставленный под ней, читается как подпись
 * к пустой вывеске.
 */
const $emits = defineEmits(['confirm', 'cancel'])
</script>

<template>
	<div class="confirm" @click="$emits('cancel')">
		<div class="confirm__in" @click.stop="">
			<div class="confirm__title">{{ $t('exitTitle') }}</div>
			<div class="confirm__hint">{{ $t('exitHint') }}</div>

			<UiButton class="confirm__btn" :width="180" @click="$emits('confirm')">
				{{ $t('exitYes') }}
			</UiButton>
			<UiButton
				class="confirm__btn"
				:bg="'grey'"
				:width="180"
				:size="'small'"
				@click="$emits('cancel')"
			>
				{{ $t('exitNo') }}
			</UiButton>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.confirm {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 1150;
	background: rgba(12, 24, 8, 0.82);
	display: flex;
	justify-content: center;
	align-items: center;
	padding: 20px;
	box-sizing: border-box;

	&__in {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
	}

	&__title {
		font-size: 32px;
		line-height: 1.15;
		letter-spacing: 3px;
		// Как у .next-modal__level: локализованный заголовок длиннее английского
		// и на узких экранах должен переноситься, а не уезжать за край.
		max-width: 90vw;
		color: rgb(254, 206, 13);
		-webkit-text-stroke: 2px rgb(45, 128, 0);
		text-stroke: 2px rgb(45, 128, 0);
		margin-bottom: 10px;
	}

	&__hint {
		max-width: 80vw;
		margin-bottom: 26px;
		font-size: 15px;
		line-height: 1.4;
		letter-spacing: 1px;
		color: rgba(255, 255, 255, 0.8);
	}

	&__btn {
		box-shadow: 0 5px 15px 0 rgba(0, 0, 0, 0.3);

		& + & {
			margin-top: 16px;
		}
	}
}
</style>
