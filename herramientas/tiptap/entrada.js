/* Punto de entrada del paquete de Tiptap para OneLearn.
   Reúne las piezas de Tiptap (y de ProseMirror, en el que se basa) que usa assets/js/editor.js
   y las deja en una sola variable global, window.Tiptap, para usarlas desde scripts clásicos.
   Para actualizar Tiptap: cambia las versiones en package.json, npm install y npm run compilar. */
import {Editor,Extension,Node,Mark,mergeAttributes,InputRule,nodeInputRule,textblockTypeInputRule,wrappingInputRule,findParentNode,generateText,getText,posToDOMRect} from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import {Placeholder,CharacterCount,Focus} from '@tiptap/extensions';
import {TaskList,TaskItem} from '@tiptap/extension-list';
import {Table,TableRow,TableHeader,TableCell} from '@tiptap/extension-table';
import Highlight from '@tiptap/extension-highlight';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import Suggestion from '@tiptap/suggestion';
import {Plugin,PluginKey,TextSelection,NodeSelection,Selection} from '@tiptap/pm/state';
import {Fragment,Slice,DOMSerializer} from '@tiptap/pm/model';
import {Decoration,DecorationSet} from '@tiptap/pm/view';

window.Tiptap={
  Editor,Extension,Node,Mark,mergeAttributes,InputRule,nodeInputRule,textblockTypeInputRule,wrappingInputRule,findParentNode,generateText,getText,posToDOMRect,
  StarterKit,Placeholder,CharacterCount,Focus,TaskList,TaskItem,Table,TableRow,TableHeader,TableCell,
  Highlight,Subscript,Superscript,Suggestion,
  pm:{Plugin,PluginKey,TextSelection,NodeSelection,Selection,Fragment,Slice,DOMSerializer,Decoration,DecorationSet}
};
