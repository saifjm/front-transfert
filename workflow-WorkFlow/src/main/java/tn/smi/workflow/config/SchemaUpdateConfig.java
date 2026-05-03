package tn.smi.workflow.config;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;

/**
 * Adds missing columns to Oracle tables at startup.
 * Replaces Flyway migrations — runs after Hibernate has created/updated the base schema.
 *
 * Add any new column here instead of a migration script.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SchemaUpdateConfig {

    private final DataSource dataSource;

    @PostConstruct
    public void addMissingColumns() {
        try (Connection conn = dataSource.getConnection()) {
            conn.setAutoCommit(true);

            // WF_DEFINITION — downstream config columns
            addColumnIfNotExists(conn, "WF_DEFINITION", "BASE_URL",          "VARCHAR2(500)");
            addColumnIfNotExists(conn, "WF_DEFINITION", "ENDPOINT_TEMPLATE", "VARCHAR2(500)");
            addColumnIfNotExists(conn, "WF_DEFINITION", "HTTP_METHOD",        "VARCHAR2(10)");
            addColumnIfNotExists(conn, "WF_DEFINITION", "RESP_BK_PATH",       "VARCHAR2(200)");
            addColumnIfNotExists(conn, "WF_DEFINITION", "PAYLOAD_BK_FIELD",   "VARCHAR2(100)");

            // WF_TRANSITION_RULE — dual finalize columns
            // finalize      = metierFinalize (passed to downstream MS)
            // wf_finalize   = workflowFinalize (true=continue, false=close as REJECTED)
            addColumnIfNotExists(conn, "WF_TRANSITION_RULE", "WF_FINALIZE", "NUMBER(1) DEFAULT 1 NOT NULL");

        } catch (Exception e) {
            log.warn("SchemaUpdateConfig failed: {}", e.getMessage());
        }
    }

    private void addColumnIfNotExists(Connection conn, String table, String column, String type) {
        try {
            boolean exists;
            try (Statement stmt = conn.createStatement();
                 ResultSet rs = stmt.executeQuery(
                         "SELECT COUNT(*) FROM USER_TAB_COLUMNS WHERE TABLE_NAME = '"
                                 + table + "' AND COLUMN_NAME = '" + column + "'")) {
                rs.next();
                exists = rs.getInt(1) > 0;
            }

            if (!exists) {
                try (Statement stmt = conn.createStatement()) {
                    stmt.execute("ALTER TABLE " + table + " ADD " + column + " " + type);
                    log.info("Added column {}.{} ({})", table, column, type);
                }
            } else {
                log.debug("Column {}.{} already exists — skipping", table, column);
            }
        } catch (Exception e) {
            log.warn("Could not add column {}.{}: {}", table, column, e.getMessage());
        }
    }
}