import 'jasmine'
import * as React from 'react'
import { ChildrenAnalyzer, BranchNode, RawNodeRepresentation, Leaf } from '../../../src'

interface FooComponentProps {
	foo: string
	baz: number
}
interface BarComponentProps {
	bar: string
	baz: number
}

const FooComponent = (props: FooComponentProps) => null
const BarComponent = (props: BarComponentProps) => null

const simpleFooComponentTree = (
	<>
		<>
			{/* This is to also test that fragments are properly ignored */}
			<FooComponent foo="abc" baz={123} />
		</>
		<FooComponent foo="def" baz={456} />
		<FooComponent foo="ghi" baz={789} />
	</>
)
const simpleFooBarComponentTree = (
	<>
		<FooComponent foo="abc" baz={123} />
		<BarComponent bar="pqr" baz={369} />
		<FooComponent foo="ghi" baz={789} />
	</>
)

enum Op {
	Plus,
	Minus,
	Times,
}
interface CalculatorBranchNodeProps {
	op: number
	children: React.ReactNode
}
const CalculatorBranchNode = (props: CalculatorBranchNodeProps) => null
CalculatorBranchNode.compute = (props: CalculatorBranchNodeProps, [operand1, operand2]: [number, number]) => {
	if (props.op === Op.Plus) {
		return operand1 + operand2
	} else if (props.op === Op.Minus) {
		return operand1 - operand2
	}
	return operand1 * operand2
}

interface NumberComponentProps {
	value: number
}
const NumberComponent = (props: NumberComponentProps) => null

const calculatorFormula = ( // 10 * ((5 - 3) + (2 * 6)) === 140
	<>
		<CalculatorBranchNode op={Op.Times}>
			<NumberComponent value={10} />
			<CalculatorBranchNode op={Op.Plus}>
				<CalculatorBranchNode op={Op.Minus}>
					<NumberComponent value={5} />
					<NumberComponent value={3} />
				</CalculatorBranchNode>
				<CalculatorBranchNode op={Op.Times}>
					<NumberComponent value={2} />
					<NumberComponent value={6} />
				</CalculatorBranchNode>
			</CalculatorBranchNode>
		</CalculatorBranchNode>
	</>
)

describe('children analyzer', () => {
	it('should gather children props', () => {
		const fooLeaf = new Leaf((props: FooComponentProps): FooComponentProps => props)
		const analyzer = new ChildrenAnalyzer<FooComponentProps>([fooLeaf])

		expect(analyzer.processChildren(simpleFooComponentTree, undefined)).toEqual([
			{ foo: 'abc', baz: 123 },
			{ foo: 'def', baz: 456 },
			{ foo: 'ghi', baz: 789 },
		])
	})
	it('should filter leaves by component type', () => {
		const fooLeaf = new Leaf((props: FooComponentProps): FooComponentProps => props, FooComponent)
		const barLeaf = new Leaf(
			(props: BarComponentProps): BarComponentProps => ({
				bar: `${props.bar}${props.bar}`,
				baz: props.baz + 1,
			}),
			BarComponent,
		)
		const analyzer = new ChildrenAnalyzer<FooComponentProps | BarComponentProps>([fooLeaf, barLeaf])

		expect(analyzer.processChildren(simpleFooBarComponentTree, undefined)).toEqual([
			{ foo: 'abc', baz: 123 },
			{ bar: 'pqrpqr', baz: 370 },
			{ foo: 'ghi', baz: 789 },
		])
	})
	it('should correctly process leaves & branch nodes', () => {
		const numberLeaf = new Leaf((props: NumberComponentProps) => props.value, NumberComponent)
		const calculatorBranchNode = new BranchNode('compute', (children: RawNodeRepresentation<number, number>): [
			number,
			number,
		] => {
			if (!children || typeof children === 'number' || children.length !== 2) {
				throw new Error('We only support binary ops')
			}
			return [children[0], children[1]]
		})
		const analyser = new ChildrenAnalyzer<number, number>([numberLeaf], [calculatorBranchNode])
		expect(analyser.processChildren(calculatorFormula, undefined)).toEqual([140])
	})
})
