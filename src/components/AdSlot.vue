<script lang="ts" setup>
import { ref } from 'vue'

import { useAdsStore } from '@/store/adsStore'
import { pickPromo, promoIcon } from '@/utils/promo'

/**
 * Место под баннер — всегда занятое.
 *
 * Высота слота больше не появляется вместе с рекламой: полоса зарезервирована с
 * самого начала и никогда не пустует. Что в ней стоит, решает не этот
 * компонент, а наличие настоящего объявления — нативный баннер рисуется поверх
 * вебвью и просто закрывает эту строку собой. Пока его нет (не загрузился, нет
 * заполнения, нет сети или это веб-версия) — в строке живёт одна из наших игр.
 *
 * Игра выбирается один раз при создании слота, а не по таймеру: полоса стоит
 * под лабиринтом, по которому идёт счёт времени, и ничего мелькающего там быть
 * не должно.
 *
 * Касание ведёт не в Play, а в наш же список игр внутри приложения, и только
 * когда это разрешено (`interactive`). Причина ровно та, что Google пишет в
 * отказе: «designed in a way that will result in inadvertent clicks from child
 * users». Полоса стоит вплотную к кнопкам-стрелкам, так что случайное касание
 * неизбежно — и оно не должно ни выбрасывать ребёнка из игры, ни стоить ему
 * партии.
 */
const $props = withDefaults(
	defineProps<{
		/** Разрешено ли открывать список игр прямо сейчас. */
		interactive?: boolean
	}>(),
	{ interactive: false }
)

const $emits = defineEmits(['open'])

const adsStore = useAdsStore()

const game = ref(pickPromo())

function tap() {
	if ($props.interactive) $emits('open')
}
</script>

<template>
	<div class="slot">
		<component
			:is="interactive ? 'button' : 'div'"
			v-if="!adsStore.bannerLive"
			class="house"
			:class="{ 'house--tap': interactive }"
			@click="tap"
		>
			<img
				class="house__icon"
				:src="promoIcon(game)"
				:alt="game.title"
				width="40"
				height="40"
			/>

			<span class="house__text">
				<span class="house__label">{{ $t('promoLabel') }}</span>
				<b class="house__title">{{ game.title }}</b>
			</span>

			<span v-if="interactive" class="house__go">{{ $t('promoOpen') }}</span>
		</component>
	</div>
</template>

<style lang="scss" scoped>
.slot {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	/*
	   Полоса занимает всю рекламную зону — от низа экрана до верха объявления.
	   Инсет входит в её высоту, а не в её отступ: когда баннера нет, отодвигать
	   не подо что, и уехавшая вверх полоса оставила бы под собой пустую кромку.
	*/
	height: var(--ad-band);
	z-index: 4;
	overflow: hidden;
	pointer-events: none;
	/*
	   Подложка живёт здесь, а не на .house, и поэтому она есть ВСЕГДА — в том
	   числе когда кросс-промо уступило место настоящему баннеру.

	   Зачем: на Android 15+ плагин вешает на decorView свой слушатель инсетов и
	   задаёт баннеру нижний отступ, равный системному инсету
	   (BannerExecutor.java, ветка VANILLA_ICE_CREAM). Баннер из-за этого висит
	   не вплотную к низу экрана, а чуть выше — и раньше в этот зазор был виден
	   лабиринт, отчего объявление выглядело просто брошенным посреди экрана.
	   Теперь под ним наша же тёмная полоса, доходящая до самой кромки.
	*/
	background: linear-gradient(180deg, #3b2a12, #241806);
	box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.08);
}

.house {
	display: flex;
	align-items: center;
	gap: 10px;
	/* Прижато к низу зоны: если инсет есть, объявление встанет именно там, и
	   кросс-промо должно стоять на его месте, а не над ним. */
	position: absolute;
	left: 0;
	right: 0;
	bottom: 0;
	width: 100%;
	height: var(--ad-slot, 56px);
	box-sizing: border-box;
	padding: 0 12px;
	border: none;
	text-align: left;
	text-decoration: none;
	pointer-events: auto;
	/* Фон унаследован от .slot: полоса заметно темнее игры и должна читаться как
	   техническая строка с рекламой, а не как часть лабиринта. Для Families
	   Policy это обязательное условие — объявление должно быть отличимо от
	   интерфейса. */
	background: transparent;

	&--tap {
		cursor: pointer;
	}

	&__icon {
		flex: 0 0 40px;
		width: 40px;
		height: 40px;
		border-radius: 10px;
		box-shadow: 0 0 0 1.5px rgba(255, 255, 255, 0.14),
			0 2px 6px rgba(0, 0, 0, 0.6);
	}

	&__text {
		flex: 1;
		min-width: 0;
	}

	&__label {
		display: block;
		font-size: 9px;
		letter-spacing: 1.4px;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.55);
	}

	&__title {
		display: block;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
		font-size: 14px;
		color: #fff;
	}

	&__go {
		flex: 0 0 auto;
		padding: 6px 11px;
		border-radius: 11px;
		font-size: 11px;
		letter-spacing: 0.8px;
		text-transform: uppercase;
		color: #241806;
		background: #ffdc16;
	}

	&--tap:active &__go {
		transform: translateY(1px);
	}
}
</style>
