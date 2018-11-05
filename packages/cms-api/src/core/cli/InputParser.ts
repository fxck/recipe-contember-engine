import Command from './Command'
import Argument from './Argument'
import Option from './Option'

class InputParser {

	constructor(
		private _arguments: Argument[],
		private options: Option[]
	) {
	}

	parse<Args extends Command.Arguments = Command.Arguments, Opts extends Command.Options = Command.Options>
	(args: string[], allowRest: boolean): Command.Input<Args, Opts> {
		let options: Opts = {} as any
		let argumentValues: Args = {} as any

		let i = 0;
		let argumentNumber = 0
		let rest: string[] = []

		for (; i < args.length; i++) {
			const value = this.tryParseValue(args[i])
			if (value === undefined) {
				break
			}
			const argument = this._arguments[argumentNumber]
			if (!argument) {
				if (allowRest) {
					rest = args.slice(i)
					i = args.length
					break
				}
				throw new InputParser.InvalidInputError(`Unresolved argument for value "${value}"`)
			}
			if (argument.validator && !argument.validator(value)) {
				throw new InputParser.InvalidInputError(`Invalid value "${value}" for argument ${argument.name}`)
			}
			if (argument.variadic) {
				argumentValues[argument.name] = argumentValues[argument.name] || []
				;(argumentValues[argument.name] as Array<string>).push(value)
			} else {
				argumentValues[argument.name] = value
				argumentNumber++
			}
		}
		for (; argumentNumber < this._arguments.length; argumentNumber++) {
			if (!this._arguments[argumentNumber].optional) {
				throw new InputParser.InvalidInputError(`Argument ${this._arguments[argumentNumber].name} is required`)
			} else {
				argumentValues[this._arguments[argumentNumber].name] = undefined
			}
		}

		for (; i < args.length; i++) {
			let option: Option | undefined
			if (args[i].startsWith('--')) {
				option = this.options.find(it => it.name === args[i].slice(2))
				if (!option) {
					throw new InputParser.InvalidInputError(`Undefined option ${args[i]}`)
				}
			} else if (args[i].startsWith('-')) {
				option = this.options.find(it => it.shortcut === args[i].slice(1))
				if (!option) {
					throw new InputParser.InvalidInputError(`Undefined option ${args[i]}`)
				}
			}
			if (!option) {
				if (!allowRest) {
					throw new InputParser.InvalidInputError(`Unexpected value "${args[i]}"`)
				} else {
					rest = args.slice(i)
				}
			}
			if (option) {
				if (option.mode === Option.Mode.VALUE_NONE) {
					options[option.name] = true
					continue
				}
				const value = this.tryParseValue(args[i + 1])
				if (value !== undefined) {
					i++
				}
				if (option.mode === Option.Mode.VALUE_ARRAY) {
					if (value === undefined) {
						throw new InputParser.InvalidInputError(`Undefined value for option --${option.name}`)
					}
					options[option.name] = options[option.name] || []
					;(options[option.name] as Array<string>).push(value)
				} else if (option.mode === Option.Mode.VALUE_REQUIRED) {
					if (value === undefined) {
						throw new InputParser.InvalidInputError(`Undefined value for option --${option.name}`)
					}
					options[option.name] = value
				} else if (option.mode === Option.Mode.VALUE_OPTIONAL) {
					options[option.name] = value === undefined ? true : value
				}
			}
		}

		for (let option of this.options) {
			if (options[option.name] !== undefined) {
				continue
			}
			if (option.required) {
				throw new InputParser.InvalidInputError(`Option --${option.name} is required`)
			} else {
				options[option.name] = undefined
			}
		}

		return new Command.Input(argumentValues, options, rest)
	}


	private tryParseValue(arg: string | undefined): string | undefined {
		if (arg === undefined) {
			return undefined
		}
		if (arg.startsWith('-')) {
			return undefined
		}
		if (arg.startsWith('\\-')) {
			return '-' + arg.slice(1)
		}
		return arg
	}
}

namespace InputParser {
	export class InvalidInputError extends Error {
	}
}

export default InputParser
