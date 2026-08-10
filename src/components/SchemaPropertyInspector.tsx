import { Fragment } from "react";
import type { PropertyProjection } from "../propertySchema";

type SchemaPropertyInspectorProps = {
  projection: PropertyProjection;
  notice?: string;
};

export function SchemaPropertyInspector({ projection, notice }: SchemaPropertyInspectorProps) {
  return (
    <details
      className="diagnostics-section schema-property-inspector"
      data-testid="atara-machine-data-diagnostics"
      data-schema-id={projection.schemaId}
      data-entity-id={projection.entityId}
      open
    >
      <summary>{projection.label}</summary>
      {projection.description ? <p className="schema-property-description">{projection.description}</p> : null}
      {notice ? <p className="collision-note">{notice}</p> : null}
      <div data-testid="schema-property-inspector">
        {projection.sections.map((section) => {
          const headingId = `property-section-${section.id}`;
          return (
            <section className="schema-property-group" aria-labelledby={headingId} key={section.id}>
              <h4 id={headingId}>{section.label}</h4>
              {section.description ? <p>{section.description}</p> : null}
              <div className="diagnostics-grid">
                {section.fields.map((field) => (
                  <Fragment key={field.id}>
                    <span title={field.help}>{field.label}</span>
                    <strong
                      data-property-id={field.id}
                      data-property-missing={field.missing ? "true" : "false"}
                    >
                      {field.displayValue}
                    </strong>
                    {field.issues.length > 0 ? (
                      <div className="schema-property-validation" role="alert" aria-live="polite">
                        {field.issues.map((issue) => (
                          <span key={issue.code}>{issue.message}</span>
                        ))}
                      </div>
                    ) : null}
                  </Fragment>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </details>
  );
}
