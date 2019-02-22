import * as React from 'react'
import {
	Avatar,
	AvatarField,
	AvatarSize,
	Block as BlockType,
	Button,
	Component,
	FieldText,
	Mark,
	PageLink,
	PageLinkById,
	RichTextField,
	SelectField,
	SortableRepeater,
	Table,
	TextAreaField,
	TextField
} from 'cms-admin'
import { Image } from './Image'
import { LocaleSideDimension } from '../LocaleSideDimension'
import { Seo } from './Seo'
import { State } from './State'
import { Block } from './Block'
import { Link } from './Link'

export const Page = Component(
	() => (
		<>
			<LocaleSideDimension>
				<TextField large={true} label="Header" name="$locale.header" />
			</LocaleSideDimension>
			<Image label="Image" name="image" />
			<SelectField label="Category" name="category" options="Category.locales(locale.slug='en').name" />
			<LocaleSideDimension>
				<State name="$locale.state" />
				<TextAreaField label="Perex" name="$locale.perex" />
				<SortableRepeater field="$locale.content" label="Content" sortBy="order">
					<Block />
				</SortableRepeater>
				<RichTextField
					label="Contact us"
					name="$locale.contactUs"
					blocks={[{ block: BlockType.PARAGRAPH, marks: [Mark.BOLD, Mark.LINK] }]}
				/>
				<Seo name="$locale.seo" />
				<Link name="$locale.link" />
			</LocaleSideDimension>
		</>
	),
	'Page'
)

export const PageListHeader = Component(
	() => (
		<>
			<Table.Row>
				<Table.Cell>
					<Avatar size={AvatarSize.Size2}>CO</Avatar>
				</Table.Cell>
				<Table.Cell>Contact</Table.Cell>
				<Table.Cell />
				<Table.Cell>
					<PageLink
						change={() => ({ name: 'contact' })}
						Component={props => (
							<Button {...props} Component="a">
								Edit
							</Button>
						)}
					/>
				</Table.Cell>
			</Table.Row>
		</>
	),
	'PageListHeader'
)

export const PageListCells = Component(
	() => (
		<>
			<Table.Cell>
				<AvatarField name="locales(locale.slug='en').header" size={AvatarSize.Size2} />
			</Table.Cell>
			<Table.Cell>
				<LocaleSideDimension>
					<FieldText name="$locale.header" />
				</LocaleSideDimension>
			</Table.Cell>
			<Table.Cell>
				<FieldText name="category.locales(locale.slug='en').name" />
			</Table.Cell>
			<Table.Cell>
				<PageLinkById
					change={id => ({ name: 'edit_page', params: { id } })}
					Component={props => (
						<Button {...props} Component="a">
							Edit
						</Button>
					)}
				/>
				{/*<RemoveButton removeType={'delete'}/>*/}
			</Table.Cell>
		</>
	),
	'PageListCells'
)
