import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Play, Square } from 'lucide-react'
import { useState } from 'react'

export default function CookControls() {
	const [mode, setMode] = useState<
		'grill' | 'smoker' | 'air fry' | 'roast' | 'bake' | 'reheat' | 'dehydrate'
	>('smoker')
	const [temperature, setTemperature] = useState<number>(225)
	const [smoke, setSmoke] = useState<boolean>(true)
	const [cookTime, setCookTime] = useState<string>('240') // minutes
	const [skipPreheat, setSkipPreheat] = useState<boolean>(false)
	const [isCooking, setIsCooking] = useState<boolean>(false)

	const handleStartStop = () => {
		setIsCooking(!isCooking)
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Cook Controls</CardTitle>
				<CardDescription>Set your cooking parameters</CardDescription>
			</CardHeader>
			<CardContent className='space-y-4'>
				<div className='space-y-2'>
					<Label>Cooking Mode</Label>
					<Select value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value='grill'>Grill</SelectItem>
							<SelectItem value='smoker'>Smoker</SelectItem>
							<SelectItem value='air fry'>Air Fry</SelectItem>
							<SelectItem value='roast'>Roast</SelectItem>
							<SelectItem value='bake'>Bake</SelectItem>
							<SelectItem value='reheat'>Reheat</SelectItem>
							<SelectItem value='dehydrate'>Dehydrate</SelectItem>
						</SelectContent>
					</Select>
				</div>

				<div className='space-y-2'>
					<div className='flex justify-between'>
						<Label>Temperature</Label>
						<span className='text-sm text-muted-foreground'>
							{temperature}°F
						</span>
					</div>
					<Slider
						value={[temperature]}
						onValueChange={([v]) => setTemperature(v)}
						min={mode === 'dehydrate' ? 95 : 180}
						max={mode === 'grill' ? 500 : mode === 'air fry' ? 450 : 400}
						step={5}
						className='w-full'
					/>
				</div>

				{mode === 'smoker' && (
					<div className='flex items-center justify-between'>
						<Label htmlFor='smoke-switch'>Smoke</Label>
						<Switch
							id='smoke-switch'
							checked={smoke}
							onCheckedChange={setSmoke}
						/>
					</div>
				)}

				<div className='space-y-2'>
					<Label>Cook Time</Label>
					<Select value={cookTime} onValueChange={setCookTime}>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value='15'>15 minutes</SelectItem>
							<SelectItem value='30'>30 minutes</SelectItem>
							<SelectItem value='60'>1 hour</SelectItem>
							<SelectItem value='120'>2 hours</SelectItem>
							<SelectItem value='240'>4 hours</SelectItem>
							<SelectItem value='480'>8 hours</SelectItem>
							<SelectItem value='720'>12 hours</SelectItem>
							<SelectItem value='1440'>24 hours</SelectItem>
						</SelectContent>
					</Select>
				</div>

				<div className='mt-6 space-y-4'>
					<div className='flex items-center justify-between'>
						<Label htmlFor='preheat-switch'>Skip Preheat</Label>
						<Switch
							id='preheat-switch'
							checked={skipPreheat}
							onCheckedChange={setSkipPreheat}
						/>
					</div>

					<Button
						className='w-full'
						size='lg'
						variant={isCooking ? 'destructive' : 'default'}
						onClick={handleStartStop}
					>
						{isCooking ? (
							<>
								<Square className='mr-2 h-4 w-4' />
								Stop Cooking
							</>
						) : (
							<>
								<Play className='mr-2 h-4 w-4' />
								Start Cooking
							</>
						)}
					</Button>
				</div>
			</CardContent>
		</Card>
	)
}
