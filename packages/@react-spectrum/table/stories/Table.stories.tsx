/*
 * Copyright 2020 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import {action} from '@storybook/addon-actions';
import {ActionButton, Button} from '@react-spectrum/button';
import Add from '@spectrum-icons/workflow/Add';
import {Breadcrumbs, Item} from '@react-spectrum/breadcrumbs';
import {ButtonGroup} from '@react-spectrum/buttongroup';
import {TableView} from '../';
import {ComponentMeta, ComponentStoryObj} from '@storybook/react';
import {Content} from '@react-spectrum/view';
import {ControllingResize, PokemonColumn} from './ControllingResize';
import {CRUDExample} from './CRUDExample';
import Delete from '@spectrum-icons/workflow/Delete';
import {Dialog, DialogTrigger} from '@react-spectrum/dialog';
import {Divider} from '@react-spectrum/divider';
import {Flex} from '@react-spectrum/layout';
import {Heading} from '@react-spectrum/text';
import {HidingColumns} from './HidingColumns';
import {HidingColumnsAllowsResizing} from './HidingColumnsAllowsResizing';
import {IllustratedMessage} from '@react-spectrum/illustratedmessage';
import {Link} from '@react-spectrum/link';
import {LoadingState} from '@react-types/shared';
import NoSearchResults from '@spectrum-icons/illustrations/NoSearchResults';
import {Radio, RadioGroup} from '@react-spectrum/radio';
import React, {Key, useCallback, useContext, useMemo, useState} from 'react';
import {SearchField} from '@react-spectrum/searchfield';
import {Switch} from '@react-spectrum/switch';
import {TextField} from '@react-spectrum/textfield';
import {useAsyncList, useListData} from '@react-stately/data';
import {useFilter} from '@react-aria/i18n';
import {View} from '@react-spectrum/view';
import {
  CollectionContext,
  CollectionRendererContext,
  useCollectionChildren,
  Collection
} from 'react-aria-components/src/Collection';
import {
  CellProps,
  ColumnProps,
  RowProps,
  TableBodyProps,
  TableHeaderProps,
  useTableOptions
} from 'react-aria-components';
import {Checkbox} from '@react-spectrum/checkbox';
import {DragButton, useTableContext, useTablePropsContext} from '../src/TableView';

export default {
  title: 'TableView',
  component: TableView,
  args: {
    onAction: action('onAction'),
    onResizeStart: action('onResizeStart'),
    onResize: action('onResize'),
    onResizeEnd: action('onResizeEnd'),
    onSelectionChange: action('onSelectionChange'),
    onSortChange: action('onSortChange')
  },
  argTypes: {
    // intentionally added so that we can unset the default value
    // there is no argType for function
    // use the controls reset button to undo it
    // https://storybook.js.org/docs/react/essentials/controls#annotation
    onAction: {
      control: 'select',
      options: [undefined]
    },
    onResizeStart: {
      table: {
        disable: true
      }
    },
    onResize: {
      table: {
        disable: true
      }
    },
    onResizeEnd: {
      table: {
        disable: true
      }
    },
    onSelectionChange: {
      table: {
        disable: true
      }
    },
    onSortChange: {
      table: {
        disable: true
      }
    },
    disabledKeys: {
      table: {
        disable: true
      }
    },
    selectedKeys: {
      table: {
        disable: true
      }
    },
    density: {
      control: 'select',
      options: ['compact', 'regular', 'spacious']
    },
    overflowMode: {
      control: 'select',
      options: ['wrap', 'truncate']
    },
    isQuiet: {
      control: 'boolean'
    },
    selectionMode: {
      control: 'select',
      options: ['none', 'single', 'multiple']
    },
    selectionStyle: {
      control: 'select',
      options: ['checkbox', 'highlight']
    },
    disallowEmptySelection: {
      control: 'boolean'
    }
  }
} as ComponentMeta<typeof TableView>;

export type TableStory = ComponentStoryObj<typeof TableView>;

export const Static: TableStory = {
  args: {
    'aria-label': 'TableView with static contents',
    width: 300,
    height: 200
  },
  render: (args) => (
    <TableView {...args}>
      <TableHeader>
        <Column key="foo" isRowHeader>Foo</Column>
        <Column key="bar">Bar</Column>
        <Column key="baz">Baz</Column>
      </TableHeader>
      <TableBody>
        <Row>
          <Cell>One</Cell>
          <Cell>Two</Cell>
          <Cell>Three</Cell>
        </Row>
        <Row>
          <Cell>One</Cell>
          <Cell>Two</Cell>
          <Cell>Three</Cell>
        </Row>
      </TableBody>
    </TableView>
  ),
  name: 'static'
};

// TODO BREAKING: required isRowHeader
let columns = [
  {name: 'Foo', key: 'foo', isRowHeader: true},
  {name: 'Bar', key: 'bar'},
  {name: 'Baz', key: 'baz'}
];

let items = [
  {id: 'Foo 1', test: 'Test 1', foo: 'Foo 1', bar: 'Bar 1', yay: 'Yay 1', baz: 'Baz 1'},
  {id: 'Foo 2', test: 'Test 2', foo: 'Foo 2', bar: 'Bar 2', yay: 'Yay 2', baz: 'Baz 2'},
  {id: 'Foo 3', test: 'Test 1', foo: 'Foo 3', bar: 'Bar 1', yay: 'Yay 1', baz: 'Baz 1'},
  {id: 'Foo 4', test: 'Test 2', foo: 'Foo 4', bar: 'Bar 2', yay: 'Yay 2', baz: 'Baz 2'},
  {id: 'Foo 5', test: 'Test 1', foo: 'Foo 5', bar: 'Bar 1', yay: 'Yay 1', baz: 'Baz 1'},
  {id: 'Foo 6', test: 'Test 2', foo: 'Foo 6', bar: 'Bar 2', yay: 'Yay 2', baz: 'Baz 2'},
  {id: 'Foo 7', test: 'Test 1', foo: 'Foo 7', bar: 'Bar 1', yay: 'Yay 1', baz: 'Baz 1'},
  {id: 'Foo 8', test: 'Test 2', foo: 'Foo 8', bar: 'Bar 2', yay: 'Yay 2', baz: 'Baz 2'}
];

export const Dynamic: TableStory = {
  args: {
    'aria-label': 'TableView with static contents',
    width: 300,
    height: 200
  },
  render: (args) => (
    <TableView {...args}>
      <TableHeader columns={columns}>
        {column => <Column isRowHeader={column.isRowHeader}>{column.name}</Column>}
      </TableHeader>
      <TableBody items={items}>
        {item =>
          (<Row columns={columns}>
            {column => <Cell>{item[column.key]}</Cell>}
          </Row>)
        }
      </TableBody>
    </TableView>
  ),
  name: 'dynamic'
};
// TODO BREAKING: had to provide columns to Row

function BaseTableHeader<T extends object>(props: TableHeaderProps<T>) {
  let children = useCollectionChildren({
    children: props.children,
    items: props.columns
  });
  let renderer = typeof props.children === 'function' ? props.children : null;
  return (
    <CollectionRendererContext.Provider value={renderer}>
      {/* @ts-ignore */}
      <tableheader multiple={props}>
        <TableHeaderRow>
          {children}
        </TableHeaderRow>
      {/* @ts-ignore */}
      </tableheader>
    </CollectionRendererContext.Provider>
  );
}

function TableHeader<T extends object>(props: TableHeaderProps<T>) {
  let {selectionStyle,
    selectionMode,
    allowsDragging} = useTablePropsContext();

  return (
    <BaseTableHeader id={props.id}>
      { /*Add extra columns for drag and drop and selection. */ }
      {allowsDragging && <Column isDragButtonCell />}
      {selectionStyle === 'checkbox' && !!selectionMode && selectionMode !== 'none' && (
        <Column isSelectionCell />
      )}
      <Collection items={props.columns}>
        {props.children}
      </Collection>
    </BaseTableHeader>
  );
}

function TableHeaderRow(props) {
  let children = useCollectionChildren({
    children: props.children,
    items: props.columns
  });

  // @ts-ignore
  return <headerrow multiple={props}>{children}</headerrow>;
}

export function Column<T extends object>(props: ColumnProps<T>): JSX.Element {
  let render = useContext(CollectionRendererContext);
  let childColumns = typeof render === 'function' ? render : props.children;
  let children = useCollectionChildren({
    children: (props.title || props.childColumns) ? childColumns : null,
    items: props.childColumns
  });

  // @ts-ignore
  return <column multiple={{...props, rendered: props.title ?? props.children}}>{children}</column>;
}

export function MyColumn<T extends object>(props: ColumnProps<T>): JSX.Element {
  let spans = props.colspan ?? 1;
  if (props.title) {

  }
  return (
    <Column id={props.id}>

      <Collection items={props.columns}>
        {props.children}
      </Collection>
    </Column>
  );
};

export function TableBody<T extends object>(props: TableBodyProps<T>) {
  let children = useCollectionChildren(props);

  // @ts-ignore
  return <tablebody multiple={props}>{children}</tablebody>;
}


export function BaseRow<T extends object>(props: RowProps<T>) {
  let children = useCollectionChildren({
    children: props.children,
    items: props.columns,
    idScope: props.id
  });

  let ctx = useMemo(() => ({idScope: props.id}), [props.id]);

  return (
    // @ts-ignore
    <item multiple={props}>
      <CollectionContext.Provider value={ctx}>
        {children}
      </CollectionContext.Provider>
      {/* @ts-ignore */}
    </item>
  );
}

function Row<T extends object>({ id, columns, children }: RowProps<T>) {
  let {selectionStyle,
    selectionMode,
    allowsDragging} = useTablePropsContext();

  return (
    <BaseRow id={id}>
      {allowsDragging && (
        <Cell isDragButtonCell />
      )}
      {selectionStyle === 'checkbox' && (!!selectionMode && selectionMode !== 'none') && (
        <Cell isSelectionCell />
      )}
      <Collection items={columns}>
        {children}
      </Collection>
    </BaseRow>
  );
}

export function Cell(props: CellProps): JSX.Element {
  // @ts-ignore
  return <cell multiple={{...props, rendered: props.children}} />;
}

export const DynamicWithDisabledKeys: TableStory = {
  ...Dynamic,
  args: {
    ...Dynamic.args,
    disabledKeys: new Set(['Foo 1', 'Foo 3'])
  },
  name: 'dynamic with disabled keys'
};

export const DynamicShowDividers: TableStory = {
  args: {
    'aria-label': 'TableView with static contents',
    width: 300,
    height: 200
  },
  render: (args) => (
    <TableView {...args}>
      <TableHeader columns={columns}>
        {column => <Column showDivider isRowHeader={column.isRowHeader}>{column.name}</Column>}
      </TableHeader>
      <TableBody items={items}>
        {item =>
          (<Row columns={columns}>
            {column => <Cell>{item[column.key]}</Cell>}
          </Row>)
        }
      </TableBody>
    </TableView>
  ),
  name: 'dynamic showDividers'
};

export const StaticNestedColumns: TableStory = {
  args: {
    'aria-label': 'TableView with nested columns',
    width: 500,
    height: 200
  },
  render: (args) => (
    <TableView {...args}>
      <TableHeader>
        <Column key="test">Test</Column>
        <Column title="Group 1" colspan={2}>
          <Column key="foo" isRowHeader>Foo</Column>
          <Column key="bar">Bar</Column>
        </Column>
        <Column title="Group 2" colspan={1}>
          <Column key="baz">Baz</Column>
        </Column>
      </TableHeader>
      <TableBody>
        <Row>
          <Cell>Test1</Cell>
          <Cell>One</Cell>
          <Cell>Two</Cell>
          <Cell>Three</Cell>
        </Row>
        <Row>
          <Cell>Test2</Cell>
          <Cell>One</Cell>
          <Cell>Two</Cell>
          <Cell>Three</Cell>
        </Row>
      </TableBody>
    </TableView>
  ),
  name: 'static with nested columns'
};

export const ResizingUncontrolledStaticWidths: TableStory = {
  args: {
    'aria-label': 'TableView with resizable columns',
    width: 800,
    height: 200
  },
  render: (args) => (
    <TableView {...args}>
      <TableHeader>
        <Column allowsResizing defaultWidth="50%" isRowHeader>File Name</Column>
        <Column allowsResizing defaultWidth="20%">Type</Column>
        <Column allowsResizing defaultWidth={239}>Size</Column>
      </TableHeader>
      <TableBody>
        <Row>
          <Cell>2018 Proposal</Cell>
          <Cell>PDF</Cell>
          <Cell>214 KB</Cell>
        </Row>
        <Row>
          <Cell>Budget</Cell>
          <Cell>XLS</Cell>
          <Cell>120 KB</Cell>
        </Row>
      </TableBody>
    </TableView>
  ),
  name: 'allowsResizing, uncontrolled, static widths'
};
