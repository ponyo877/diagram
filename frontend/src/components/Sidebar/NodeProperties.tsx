import { nanoid } from 'nanoid'
import type { Node } from '@xyflow/react'
import type { ClassNodeData, Visibility, Attribute, Method, Parameter } from '../../types/diagram'

interface NodePropertiesProps {
  node: Node
  onUpdate: (id: string, data: Record<string, unknown>) => void
  onDelete: (id: string) => void
}

const VISIBILITY_OPTIONS: { value: Visibility; label: string }[] = [
  { value: '+', label: '+ public' },
  { value: '-', label: '- private' },
  { value: '#', label: '# protected' },
  { value: '~', label: '~ package' },
]

function PropSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-figma-border">
      <div className="px-3 py-2 text-[10px] font-semibold text-figma-light uppercase tracking-widest">
        {title}
      </div>
      <div className="px-3 pb-3">{children}</div>
    </div>
  )
}

function PropInput({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="mb-2">
      <label className="block text-[10px] text-figma-muted mb-1">{label}</label>
      <input
        className="w-full h-7 px-2 text-[12px] bg-figma-canvas border border-figma-border rounded
                   focus:outline-none focus:border-figma-blue focus:bg-white transition-colors"
        {...props}
      />
    </div>
  )
}

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
    <div className="flex flex-col">
      {/* 基本情報 */}
      <PropSection title="基本情報">
        <PropInput
          label={isInterface ? 'インターフェース名' : 'クラス名'}
          value={data.name}
          onChange={(e) => update({ name: e.target.value })}
        />
        {isInterface ? (
          <div className="mb-2">
            <label className="block text-[10px] text-figma-muted mb-1">ステレオタイプ</label>
            <div className="h-7 px-2 flex items-center text-[12px] bg-figma-canvas border border-figma-border rounded text-figma-light font-mono">
              {'<<interface>>'}
            </div>
          </div>
        ) : (
          <PropInput
            label="ステレオタイプ"
            value={data.stereotype}
            placeholder="例: <<abstract>>"
            onChange={(e) => update({ stereotype: e.target.value })}
          />
        )}
        <div className="mb-2">
          <label className="block text-[10px] text-figma-muted mb-1">背景色</label>
          <div className="flex gap-2 items-center">
            <input
              type="color"
              value={data.color}
              onChange={(e) => update({ color: e.target.value })}
              className="w-7 h-7 border border-figma-border rounded cursor-pointer shrink-0 p-0.5 bg-figma-canvas"
            />
            <input
              className="flex-1 h-7 px-2 text-[12px] font-mono bg-figma-canvas border border-figma-border rounded focus:outline-none focus:border-figma-blue transition-colors"
              value={data.color}
              onChange={(e) => update({ color: e.target.value })}
            />
          </div>
        </div>
      </PropSection>

      {/* 属性 */}
      <PropSection title="属性">
        {data.attributes.map((attr) => (
          <div key={attr.id} className="grid grid-cols-[28px_1fr_1fr_16px] gap-1 items-center mb-1.5">
            <select
              value={attr.visibility}
              onChange={(e) => updateAttribute(attr.id, { visibility: e.target.value as Visibility })}
              className="h-6 text-[11px] bg-figma-canvas border border-figma-border rounded px-0.5 focus:outline-none focus:border-figma-blue"
            >
              {VISIBILITY_OPTIONS.map((v) => (
                <option key={v.value} value={v.value}>{v.value}</option>
              ))}
            </select>
            <input
              className="h-6 px-1.5 text-[11px] bg-figma-canvas border border-figma-border rounded focus:outline-none focus:border-figma-blue min-w-0"
              value={attr.name}
              placeholder="名前"
              onChange={(e) => updateAttribute(attr.id, { name: e.target.value })}
            />
            <input
              className="h-6 px-1.5 text-[11px] bg-figma-canvas border border-figma-border rounded focus:outline-none focus:border-figma-blue min-w-0"
              value={attr.type}
              placeholder="型"
              onChange={(e) => updateAttribute(attr.id, { type: e.target.value })}
            />
            <button
              onClick={() => deleteAttribute(attr.id)}
              className="flex items-center justify-center text-figma-light hover:text-figma-red transition-colors text-xs"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          onClick={addAttribute}
          className="text-[11px] text-figma-blue hover:text-figma-blue-hover transition-colors mt-1"
        >
          + 属性を追加
        </button>
      </PropSection>

      {/* メソッド */}
      <PropSection title="メソッド">
        {data.methods.map((method) => (
          <div key={method.id} className="mb-3">
            <div className="grid grid-cols-[28px_1fr_1fr_16px] gap-1 items-center mb-1">
              <select
                value={method.visibility}
                onChange={(e) => updateMethod(method.id, { visibility: e.target.value as Visibility })}
                className="h-6 text-[11px] bg-figma-canvas border border-figma-border rounded px-0.5 focus:outline-none focus:border-figma-blue"
              >
                {VISIBILITY_OPTIONS.map((v) => (
                  <option key={v.value} value={v.value}>{v.value}</option>
                ))}
              </select>
              <input
                className="h-6 px-1.5 text-[11px] bg-figma-canvas border border-figma-border rounded focus:outline-none focus:border-figma-blue min-w-0"
                value={method.name}
                placeholder="method"
                onChange={(e) => updateMethod(method.id, { name: e.target.value })}
              />
              <input
                className="h-6 px-1.5 text-[11px] bg-figma-canvas border border-figma-border rounded focus:outline-none focus:border-figma-blue min-w-0"
                value={method.returnType}
                placeholder="戻り値型"
                onChange={(e) => updateMethod(method.id, { returnType: e.target.value })}
              />
              <button
                onClick={() => deleteMethod(method.id)}
                className="flex items-center justify-center text-figma-light hover:text-figma-red transition-colors text-xs"
              >
                ✕
              </button>
            </div>
            {/* 引数 */}
            <div className="ml-3 border-l border-figma-border pl-2">
              {method.parameters.map((param, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_1fr_16px] gap-1 items-center mb-1">
                  <input
                    className="h-5 px-1.5 text-[10px] bg-figma-canvas border border-figma-border rounded focus:outline-none focus:border-figma-blue min-w-0"
                    value={param.name}
                    placeholder="param"
                    onChange={(e) => updateParameter(method.id, idx, { name: e.target.value })}
                  />
                  <input
                    className="h-5 px-1.5 text-[10px] bg-figma-canvas border border-figma-border rounded focus:outline-none focus:border-figma-blue min-w-0"
                    value={param.type}
                    placeholder="Type"
                    onChange={(e) => updateParameter(method.id, idx, { type: e.target.value })}
                  />
                  <button
                    onClick={() => deleteParameter(method.id, idx)}
                    className="flex items-center justify-center text-figma-light hover:text-figma-red transition-colors text-[10px]"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                onClick={() => addParameter(method.id)}
                className="text-[10px] text-figma-muted hover:text-figma-blue transition-colors mt-0.5"
              >
                + 引数追加
              </button>
            </div>
          </div>
        ))}
        <button
          onClick={addMethod}
          className="text-[11px] text-figma-blue hover:text-figma-blue-hover transition-colors"
        >
          + メソッドを追加
        </button>
      </PropSection>

      {/* 削除 */}
      <button
        onClick={() => onDelete(node.id)}
        className="flex items-center justify-center gap-1.5 text-[11px] text-figma-red hover:text-red-700 px-3 py-3 transition-colors"
      >
        ノードを削除
      </button>
    </div>
  )
}
