import { Box, EditPage, NavigateBackButton, TextField, ToOne } from 'cms-admin'
import * as React from 'react'
import { ImageField } from '../components'
import { LinkForm, SeoForm } from '../forms'

export const TapstersPage = (
	<EditPage
		pageName="tapstersPage"
		entityName="Site"
		where="(slug = $site)"
		rendererProps={{
			title: 'Tapsters page',
			navigation: <NavigateBackButton to="tapsterList">Tapsters</NavigateBackButton>,
		}}
	>
		<ToOne field={'tapstersPage'}>
			<Box>
				<TextField name={'title'} size="large" label="Title" allowNewlines={true} />
				<LinkForm />
			</Box>
			<ImageField name={'headerImage'} label={'Header image'} />
			<SeoForm />
		</ToOne>
	</EditPage>
)
