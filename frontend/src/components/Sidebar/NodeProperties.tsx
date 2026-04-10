import { nanoid } from 'nanoid'
import type { Node } from '@xyflow/react'
import type { ClassNodeData, Visibility, Attribute, Method, Parameter } from '../../types/diagram'

interface NodePropertiesProps {
  node: Node
  onUpdate: (id: string, data: Record<string, unknown>) => void
  onDelete: (id: string) => void
}

const VISIBILITY_OPTIONS: Visibility[] = ['+', '-', '#', '~']

export default function NodeProperties({ node, onUpdate, onDelete }: NodePropertiesProps) {
  const data = node.data as unknown as ClassNodeData
  const isInterface = node.type === 'interface'

  const update = (patch: Partial<ClassNodeData>) =>
    onUpdate(node.id, patch as Record<string, unknown>)

  const addAttribute = () => {
    update({
      attributes: [
        ...data.attributes,
        { id: nanoid(), visibility: '+', name: 'attribute', type: 'String' },
      ],
    })
  }

  const updateAttribute = (id: string, patch: Partial<Attribute>) => {
    update({
      attributes: data.attributes.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    })
  }

  const deleteAttribute = (id: string) => {
    update({ attributes: data.attributes.filter((a) => a.id !== id) })
  }

  const addMethod = () => {
    update({
      methods: [
        ...data.methods,
        { id: nanoid(), visibility: '+', name: 'method', parameters: [], returnType: 'void' },
      ],
    })
  }

  const updateMethod = (id: string, patch: Partial<Method>) => {
    update({
      methods: data.methods.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    })
  }

  const deleteMethod = (id: string) => {
    update({ methods: data.methods.filter((m) => m.id !== id) })
  }

  const addParameter = (methodId: string) => {
    const method = data.methods.find((m) => m.id === methodId)
    if (!method) return
    updateMethod(methodId, {
      parameters: [...method.parameters, { name: 'param', type: 'String' }],
    })
  }

  const updateParameter = (methodId: string, idx: number, patch: Partial<Parameter>) => {
    const method = data.methods.find((m) => m.id === methodId)
    if (!method) return
    updateMethod(methodId, {
      parameters: method.parameters.map((p, i) => (i === idx ? { ...p, ...patch } : p)),
    })
  }

  const deleteParameter = (methodId: string, idx: number) => {
    const method = data.methods.find((m) => m.id === methodId)
    if (!method) return
    updateMethod(methodId, {
      parameters: method.parameters.filter((_, i) => i !== idx),
    })
  }

  return (
    <div className="p-3 flex flex-col gap-3 text-sm">
      {/* 名前 */}
      <div>
        <label className="text-xs text-gray-500 font-medium">
          {isInterface ? 'インターフェース名' : 'クラス名'}
        </label>
        <input
          className="w-full mt-1 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500"
          value={data.name}
          onChange={(e) => update({ name: e.target.value })}
        />
      </div>

      {/* ステレオタイプ */}
      <div>
        <label className="text-xs text-gray-500 font-medium">ステレオタイプ</label>
        {isInterface ? (
          <div className="mt-1 border border-gray-200 rounded px-2 py-1 text-sm text-gray-400 bg-gray-50 font-mono">
            {'<<interface>>'}
          </div>
        ) : (
          <input
            className="w-full mt-1 border border-gray-300 rounded px-2 py-1 text-sm font-mono focus:outline-none focus:border-blue-500"
            value={data.stereotype}
            placeholder="例: <<abstract>>"
            onChange={(e) => update({ stereotype: e.target.value })}
          />
        )}
      </div>

      {/* 背景色 */}
      <div>
        <label className="text-xs text-gray-500 font-medium">背景色</label>
        <div className="flex gap-2 mt-1 items-center">
          <input
            type="color"
            value={data.color}
            onChange={(e) => update({ color: e.target.value })}
            className="w-8 h-8 border border-gray-300 rounded cursor-pointer shrink-0"
          />
          <input
            className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm font-mono focus:outline-none focus:border-blue-500"
            value={data.color}
            onChange={(e) => update({ color: e.target.value })}
          />
        </div>
      </div>

      {/* 属性 */}
      <div>
        <div className="text-xs text-gray-500 font-medium mb-1">属性</div>
        {data.attributes.map((attr) => (
          <div key={attr.id} className="flex gap-1 mb-1 items-center">
            <select
              value={attr.visibility}
              onChange={(e) =>
                updateAttribute(attr.id, { visibility: e.target.value as Visibility })
              }
              className="border border-gray-300 rounded px-1 text-xs w-9 focus:outline-none shrink-0"
            >
              {VISIBILITY_OPTIONS.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
            <input
              className="flex-1 min-w-0 border border-gray-300 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-blue-500"
              value={attr.name}
              placeholder="name"
              onChange={(e) => updateAttribute(attr.id, { name: e.target.value })}
            />
            <span className="text-gray-400 text-xs shrink-0">:</span>
            <input
              className="flex-1 min-w-0 border border-gray-300 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-blue-500"
              value={attr.type}
              placeholder="Type"
              onChange={(e) => updateAttribute(attr.id, { type: e.target.value })}
            />
            <button
              onClick={() => deleteAttribute(attr.id)}
              className="text-gray-400 hover:text-red-500 text-xs px-1 shrink-0"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          onClick={addAttribute}
          className="text-xs text-blue-600 hover:text-blue-800 mt-0.5"
        >
          + 属性を追加
        </button>
      </div>

      {/* メソッド */}
      <div>
        <div className="text-xs text-gray-500 font-medium mb-1">メソッド</div>
        {data.methods.map((method) => (
          <div key={method.id} className="mb-2">
            <div className="flex gap-1 items-center">
              <select
                value={method.visibility}
                onChange={(e) =>
                  updateMethod(method.id, { visibility: e.target.value as Visibility })
                }
                className="border border-gray-300 rounded px-1 text-xs w-9 focus:outline-none shrink-0"
              >
                {VISIBILITY_OPTIONS.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
              <input
                className="flex-1 min-w-0 border border-gray-300 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-blue-500"
                value={method.name}
                placeholder="method"
                onChange={(e) => updateMethod(method.id, { name: e.target.value })}
              />
              <span className="text-gray-400 text-xs shrink-0">:</span>
              <input
                className="w-14 border border-gray-300 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-blue-500 shrink-0"
                value={method.returnType}
                placeholder="Type"
                onChange={(e) => updateMethod(method.id, { returnType: e.target.value })}
              />
              <button
                onClick={() => deleteMethod(method.id)}
                className="text-gray-400 hover:text-red-500 text-xs px-1 shrink-0"
              >
                ✕
              </button>
            </div>
            {/* 引数 */}
            <div className="ml-3 mt-1 border-l border-gray-200 pl-2">
              {method.parameters.map((param, idx) => (
                <div key={idx} className="flex gap-1 items-center mb-0.5">
                  <input
                    className="flex-1 min-w-0 border border-gray-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-blue-400 bg-gray-50"
                    value={param.name}
                    placeholder="param"
                    onChange={(e) => updateParameter(method.id, idx, { name: e.target.value })}
                  />
                  <span className="text-gray-300 text-xs shrink-0">:</span>
                  <input
                    className="flex-1 min-w-0 border border-gray-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-blue-400 bg-gray-50"
                    value={param.type}
                    placeholder="Type"
                    onChange={(e) => updateParameter(method.id, idx, { type: e.target.value })}
                  />
                  <button
                    onClick={() => deleteParameter(method.id, idx)}
                    className="text-gray-300 hover:text-red-400 text-xs px-1 shrink-0"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                onClick={() => addParameter(method.id)}
                className="text-xs text-gray-400 hover:text-blue-600 mt-0.5"
              >
                + 引数追加
              </button>
            </div>
          </div>
        ))}
        <button
          onClick={addMethod}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          + メソッドを追加
        </button>
      </div>

      <hr className="border-gray-200" />

      <button
        onClick={() => onDelete(node.id)}
        className="w-full text-sm text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 rounded py-1.5 transition-colors"
      >
        ノードを削除
      </button>
    </div>
  )
}
