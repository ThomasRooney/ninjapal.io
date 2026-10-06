import { fireEvent, within } from '@testing-library/dom'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
	TenderizationCardView,
	type TenderizationCardViewProps,
} from './tenderization-card'

const MIN = 60_000
const defaults: TenderizationCardViewProps = {
	result: {
		equivalentMinutes: 100.4,
		observedMs: 60 * MIN,
		missingMs: 10 * MIN,
		fastZoneMs: 40 * MIN,
		belowModelMs: 0,
		currentRate: 1.67,
	},
	restResult: null,
	loading: false,
	probe: 1,
	onProbeChange: vi.fn(),
	restHours: 0,
	onRestHoursChange: vi.fn(),
	ended: true,
	restCapped: false,
	prefersCelsius: false,
}

let cleanup: (() => void) | undefined
beforeEach(() => vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true))
// Match the existing React 19 tests: one React root, with Testing Library's
// DOM queries/events, avoiding its second React dispatcher under Vitest.
function render(props: Partial<TenderizationCardViewProps> = {}) {
	const container = document.createElement('div')
	document.body.appendChild(container)
	const root = createRoot(container)
	act(() =>
		root.render(
			createElement(TenderizationCardView, { ...defaults, ...props }),
		),
	)
	cleanup = () => {
		act(() => root.unmount())
		container.remove()
	}
	return within(container)
}

afterEach(() => {
	cleanup?.()
	vi.useRealTimers()
	vi.clearAllMocks()
	vi.unstubAllGlobals()
})

describe('tenderization card', () => {
	it('shows loading without stale totals and offers recovery if loading stalls', () => {
		vi.useFakeTimers()
		const view = render({ loading: true })
		expect(view.getByTestId('tenderization-loading').textContent).toContain(
			'Loading',
		)
		expect(view.queryByTestId('tenderization-dose')).toBeNull()
		act(() => vi.advanceTimersByTime(15_000))
		expect(view.getByTestId('tenderization-loading').textContent).toContain(
			'reload this page',
		)
	})

	it('shows unavailable probe history as empty, not zero conversion', () => {
		const view = render({
			probe: 2,
			result: { ...defaults.result, observedMs: 0, equivalentMinutes: 0 },
		})
		expect(view.getByTestId('tenderization-empty').textContent).toContain(
			'No usable history for Probe 2',
		)
		expect(view.queryByTestId('tenderization-dose')).toBeNull()
	})

	it('labels the model, its units, and incomplete coverage', () => {
		const view = render()
		expect(view.getByTestId('tenderization-dose').textContent).toBe('1h 40m')
		expect(view.getByTestId('tenderization-hot-time').textContent).toBe('40m')
		expect(view.getByTestId('tenderization-coverage').textContent).toBe('85%')
		expect(view.getByTestId('tenderization-incomplete').textContent).toContain(
			'10m',
		)
		expect(view.getByText('Equivalent time at 195°F')).toBeTruthy()
		expect(view.getByText(/not a percentage of collagen/)).toBeTruthy()
		expect(view.getByText('Experimental')).toBeTruthy()
	})

	it('respects Celsius without changing the exposure', () => {
		const view = render({ prefersCelsius: true })
		expect(view.getByText('Equivalent time at 90.6°C')).toBeTruthy()
		expect(view.getByTestId('tenderization-dose').textContent).toBe('1h 40m')
	})

	it('switches probes and rest windows through labelled controls', () => {
		const onProbeChange = vi.fn()
		const onRestHoursChange = vi.fn()
		const view = render({ onProbeChange, onRestHoursChange })
		act(() =>
			fireEvent.change(view.getByLabelText('Meat probe'), {
				target: { value: '2' },
			}),
		)
		act(() =>
			fireEvent.change(view.getByLabelText('Include rest'), {
				target: { value: '4' },
			}),
		)
		expect(onProbeChange).toHaveBeenCalledWith(2)
		expect(onRestHoursChange).toHaveBeenCalledWith(4)
	})

	it('explains measured rest and the next-cook boundary', () => {
		const view = render({
			restHours: 2,
			restResult: { ...defaults.result, equivalentMinutes: 20 },
			restCapped: true,
		})
		expect(view.getByTestId('tenderization-rest-note').textContent).toContain(
			'same brisket',
		)
		expect(view.getByTestId('tenderization-rest-note').textContent).toContain(
			'adds 20m',
		)
		expect(view.getByTestId('tenderization-rest-note').textContent).toContain(
			'stops at the next cook',
		)
	})

	it('keeps rest controls out of active cooks', () => {
		const view = render({ ended: false })
		expect(view.queryByLabelText('Include rest')).toBeNull()
	})
})
