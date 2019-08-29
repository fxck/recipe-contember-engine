import { storiesOf } from '@storybook/react'
import * as React from 'react'
import { ButtonList } from '../../src/components/forms/ButtonList'
import { simpleButtonStory } from './Button'

storiesOf('ButtonList', module).add('simple', () => <ButtonList>{simpleButtonStory()}</ButtonList>)
